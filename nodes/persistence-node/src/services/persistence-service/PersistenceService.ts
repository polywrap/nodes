import { IpfsConfig } from "../../config/IpfsConfig";
import * as IPFS from "ipfs-core";
import { Logger } from "../Logger";
import { InMemoryFile, IpfsAddResult, TrackedIpfsHashInfo } from "../../types";
import { TrackedIpfsHashStatus } from "../../types/TrackedIpfsHashStatus";
import { addSeconds } from "../../utils/addSeconds";
import { PersistenceStateManager } from "../PersistenceStateManager";
import { sleep } from "../../utils/sleep";
import { IndexRetriever } from "../IndexRetriever";
import { PersistenceConfig } from "../../config/PersistenceConfig";
import { calculateCIDsToTrackAndUntrack } from "./utils/calculateCIDsToTrackAndUntrack";
import { ValidationService } from "../ValidationService";
import { addFilesToIpfs, tryIpfsRequestWithFallbacks, loadFilesFromIpfsOrThrow } from "../../ipfs";

type ActionPromise = () => Promise<void>;

interface IDependencies {
  logger: Logger;
  persistenceStateManager: PersistenceStateManager;
  ipfsNode: IPFS.IPFS;
  ipfsConfig: IpfsConfig;
  persistenceConfig: PersistenceConfig;
  indexRetriever: IndexRetriever;
  validationService: ValidationService;
}

export class PersistenceService {
  deps: IDependencies;

  constructor(deps: IDependencies) {
    this.deps = deps;
  }

  async run(): Promise<void> {
    while(true) {
      let timestamp = process.hrtime();

      const indexes = await this.deps.indexRetriever.getCIDs(); 
      const tracked = this.deps.persistenceStateManager.getTrackedIpfsHashInfos();
  
      const { toTrack, toUntrack } = await calculateCIDsToTrackAndUntrack(indexes, tracked, this.deps.persistenceStateManager);
  
      const trackTasks: ActionPromise[] = toTrack.map(x => () => this.tryTrackIpfsHash.bind(this)(x));
      const untrackTasks: ActionPromise[] = toUntrack.map(x => () => this.tryUntrackIpfsHash.bind(this)(x));
  
      this.deps.logger.log(`${toTrack.length} CIDs to track, ${toUntrack.length} to untrack`);

      await this.processTasksInBatches([...trackTasks, ...untrackTasks], timestamp);
      await this.sleepUntilNextPersistenceRun(timestamp);
    }
  }

  async scheduleRetry(ipfsHash: string, retryCount: number, status: TrackedIpfsHashStatus, indexes: string[]): Promise<void> {
    this.deps.logger.log(`Scheduling retry for ${ipfsHash} (${status})`);
   
    if(retryCount >= this.deps.persistenceConfig.wrapper.resolution.retries.max) {
      this.deps.persistenceStateManager.setIpfsHashInfo(ipfsHash, {
        ipfsHash,
        status: TrackedIpfsHashStatus.Lost,
        previousStatus: status,
        indexes,
      });

      this.deps.logger.log(`Wrapper ${ipfsHash} is now considered lost`);
    } else {
      const startingDelayInSec = this.deps.persistenceConfig.wrapper.resolution.retries.startingDelayInSec;

      this.deps.persistenceStateManager.setIpfsHashInfo(ipfsHash, {
        ipfsHash,
        status,
        indexes,
        unresponsiveInfo: {
          scheduledRetryDate: addSeconds(new Date(), startingDelayInSec * Math.pow(2, retryCount)),
          retryCount: retryCount,
        }
      });
    }
  }

  async pinWrapper(ipfsHash: string, retryCount: number, indexes: string[]): Promise<void> {
    this.deps.logger.log(`Pinning ${ipfsHash}...`);

    try {
      await this.deps.ipfsNode.pin.add(ipfsHash, {
        recursive: true,
        timeout: this.deps.ipfsConfig.pinTimeout,
      });

      this.deps.persistenceStateManager.setIpfsHashInfo(ipfsHash, {
        ipfsHash,
        status: TrackedIpfsHashStatus.Pinned,
        indexes
      });
  
      this.deps.logger.log(`Pinned ${ipfsHash}`);
      
    } catch (err) {
      this.deps.logger.log(JSON.stringify(err));
     
      await this.scheduleRetry(ipfsHash, retryCount, TrackedIpfsHashStatus.Pinning, indexes);
    }
  }
  
  async unpinWrapper(ipfsHash: string): Promise<boolean> {
    try {
      await this.deps.ipfsNode.pin.rm(ipfsHash, {
        recursive: true,
        timeout: this.deps.ipfsConfig.unpinTimeout,
      });
  
      this.deps.logger.log(`Unpinned ${ipfsHash}`);
      return true;
    } catch (err: any) {
      const message = err.message 
        ? err.message
        : "";
      if(message === "not pinned or pinned indirectly") {
        this.deps.logger.log(`IPFS hash is already unpinned, removing: ${ipfsHash}...`);
        return true;
      } else {
        this.deps.logger.log(`Failed to unpin ${ipfsHash}, message: ${message}, error: ${JSON.stringify(err)}`);
        return false;
      }
    }
  }

  private async processTasksInBatches(tasks: ActionPromise[], lastTimestamp: [number, number]): Promise<void> {
    //Process tasks in batches of `persistenceMaxParallelTaskCount`
    let tasksToProcess = this.takeTasks(tasks, this.deps.persistenceConfig.persistenceMaxParallelTaskCount);
    while(tasksToProcess.length) {
      if(!this.hasLeftoverTimeInCurrentRun(lastTimestamp)) {
        return;
      }
   
      await Promise.all(tasksToProcess.map(x => x()));
      tasksToProcess = this.takeTasks(tasks, this.deps.persistenceConfig.persistenceMaxParallelTaskCount);
    }
  }

  private hasLeftoverTimeInCurrentRun(lastTimestamp: [number, number]): boolean {
    //If less than `persistenceConfig.persistenceInterval` seconds have passed then there is leftover time
    if(this.getMilisecondsFromLastRun(lastTimestamp) < this.deps.persistenceConfig.persistenceIntervalSeconds * 1000) {
      return true;
    }
    
    return false;
  }

  private getMilisecondsFromLastRun(lastTimestamp: [number, number]): number {
    const newTimestamp = process.hrtime(lastTimestamp);
    return newTimestamp[0] * 1000 + newTimestamp[1] / 1000000;
  }

  private async sleepUntilNextPersistenceRun(lastTimestamp: [number, number]): Promise<void> {
    const milisecondsFromLastRun = this.getMilisecondsFromLastRun(lastTimestamp);

    //If less than `persistenceConfig.persistenceInterval` seconds have passed then there is leftover time
    if(milisecondsFromLastRun < this.deps.persistenceConfig.persistenceIntervalSeconds * 1000) {
      //Get the difference to wait for
      const difference = this.deps.persistenceConfig.persistenceIntervalSeconds * 1000 - milisecondsFromLastRun;

      //Wait for the difference (in miliseconds)
      await sleep(difference);
    }
  }

  //Takes the first `count` tasks from `tasks` and returns them
  //Additionally, it removes the taken tasks from `tasks`
  private takeTasks(tasks: ActionPromise[], count: number): ActionPromise[] {
    const result: ActionPromise[] = [];
    for(let i = 0; i < count; i++) {
      if(tasks.length > 0) {
        result.push(tasks.shift()!);
      }
    }

    return result;
  }

  private async tryTrackIpfsHash(ipfsHashToTrack: {
    ipfsHash: string,
    indexes: string[]
  }): Promise<void> {
    const { ipfsHash, indexes } = ipfsHashToTrack;

    const info = this.deps.persistenceStateManager.getTrackedIpfsHashInfo(ipfsHash);
    const retryCount = info?.unresponsiveInfo?.retryCount || info?.unresponsiveInfo?.retryCount === 0
      ? info?.unresponsiveInfo?.retryCount + 1
      : 0;

    if(info) {
      switch (info.status) {
        case TrackedIpfsHashStatus.Pinned:
        case TrackedIpfsHashStatus.Lost:
        case TrackedIpfsHashStatus.NotAWrapper:
          return;
        case TrackedIpfsHashStatus.Pinning:
          await this.pinWrapper(ipfsHash, retryCount, indexes);  
          break;
        case TrackedIpfsHashStatus.ValidWrapperCheck:
          await this.pinIfWrapper(ipfsHash, retryCount, indexes);
          break;
        default:
          this.deps.logger.log(`Unsupported status to track: ${info.status}`)
          break;
      }
    } else {
      await this.pinIfWrapper(ipfsHash, retryCount, indexes);
    }
  }

  private async pinIfWrapper(ipfsHash: string, retryCount: number, indexes: string[]): Promise<void> {
    this.deps.logger.log(`Checking if valid wrapper: ${ipfsHash}...`);
   
    const { result, files } = await this.isValidWrapper(ipfsHash);

    switch (result) {
      case "Valid":
        const filesToAdd = files as InMemoryFile[];
        const { rootCid } = await addFilesToIpfs(
          filesToAdd,
          { onlyHash: false },
          this.deps.ipfsNode
        );
  
        if(!rootCid) {
          this.deps.logger.log(`Local and remote hashes do not match: ${ipfsHash}, local hash is not a directory...`);
          await this.deps.persistenceStateManager.setIpfsHashInfo(ipfsHash, {
            ipfsHash,
            status: TrackedIpfsHashStatus.NotAWrapper,
            indexes,
          });
        } else if (rootCid === ipfsHash) {
          await this.deps.persistenceStateManager.setIpfsHashInfo(ipfsHash, {
            ipfsHash,
            status: TrackedIpfsHashStatus.Pinning,
            indexes,
          });
      
          await this.pinWrapper(ipfsHash, retryCount, indexes);  
        } else {
          this.deps.logger.log(`Local and remote hashes do not match: ${ipfsHash}, ${rootCid}...`);
          await this.deps.persistenceStateManager.setIpfsHashInfo(ipfsHash, {
            ipfsHash,
            status: TrackedIpfsHashStatus.NotAWrapper,
            indexes,
          });
        }
        break;
      case "Invalid":
        await this.deps.persistenceStateManager.setIpfsHashInfo(ipfsHash, {
          ipfsHash,
          status: TrackedIpfsHashStatus.NotAWrapper,
          indexes,
        });
        break;
      default:
        this.deps.logger.log(`Could not fetch wrapper or error occurred, scheduling retry: ${ipfsHash}...`);
        await this.scheduleRetry(ipfsHash, retryCount, TrackedIpfsHashStatus.ValidWrapperCheck, indexes);
        break;
    }
  }

  private async isValidWrapper(ipfsHash: string): Promise<{
    result: "Valid" | "Invalid" | "Error",
    files?: InMemoryFile[]
  }>   {
    let files: InMemoryFile[] | undefined;

    try {
      files = await tryIpfsRequestWithFallbacks(
        this.deps.ipfsNode, 
        this.deps.ipfsConfig.gateways, 
        (ipfsNode: IPFS.IPFS) => loadFilesFromIpfsOrThrow(ipfsHash, ipfsNode, this.deps.ipfsConfig.gatewayTimeout)
      );
    } catch {
      return { 
        result: "Error"
      };
    }

    if (!files) {
      return { 
        result: "Error"
      };
    }

    const result = await this.deps.validationService.validateInMemoryWrapper(files);

    if(result.valid) {
      return { 
        result: "Valid",
        files
      };
    } else {
      this.deps.logger.log(`IPFS hash ${ipfsHash} is not a valid wrapper. Reason: ${result.failReason as number}`);
      return { 
        result: "Invalid"
      };
    }
  }
  
  private async tryUntrackIpfsHash(info: TrackedIpfsHashInfo): Promise<void> {
    if(info.status !== TrackedIpfsHashStatus.Pinned && 
      info.status !== TrackedIpfsHashStatus.Pinning &&
      info.status !== TrackedIpfsHashStatus.Unpinning
    ) {
      this.deps.logger.log(`Stopping tracking of ${info.ipfsHash} (not a wrapper or undefined)`);
      this.deps.persistenceStateManager.removeIpfsHash(info.ipfsHash);
      return;
    } 
  }
}

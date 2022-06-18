import { IpfsConfig } from "../../config/IpfsConfig";
import * as IPFS from 'ipfs-core';
import { Logger } from "../Logger";
import { isWrapper } from "../../isWrapper";
import { TrackedIpfsHashInfo } from "../../types/TrackedIpfsHashInfo";
import { TrackedIpfsHashStatus } from "../../types/TrackedIpfsHashStatus";
import { addSeconds } from "../../utils/addSeconds";
import { PersistenceStateManager } from "../PersistenceStateManager";
import { sleep } from "../../sleep";
import { IndexRetriever } from "../IndexRetriever";
import { PersistenceConfig } from "../../config/PersistenceConfig";
import { calculateCIDsToTrackAndUntrack } from "./utils/calculateCIDsToTrackAndUntrack";

type ActionPromise = () => Promise<void>;

interface IDependencies {
  persistenceStateManager: PersistenceStateManager;
  ipfsNode: IPFS.IPFS;
  ipfsConfig: IpfsConfig;
  persistenceConfig: PersistenceConfig;
  indexRetriever: IndexRetriever;
  logger: Logger;
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

    const result = await isWrapper(this.deps.ipfsNode, this.deps.ipfsConfig, this.deps.logger, ipfsHash);

    if(result === "yes") {
      await this.deps.persistenceStateManager.setIpfsHashInfo(ipfsHash, {
        ipfsHash,
        status: TrackedIpfsHashStatus.Pinning,
        indexes,
      });

      await this.pinWrapper(ipfsHash, retryCount, indexes);  
    } else if (result === "no") {
      await this.deps.persistenceStateManager.setIpfsHashInfo(ipfsHash, {
        ipfsHash,
        status: TrackedIpfsHashStatus.NotAWrapper,
        indexes,
      });
    } else if (result === "timeout") {
      await this.scheduleRetry(ipfsHash, retryCount, TrackedIpfsHashStatus.ValidWrapperCheck, indexes);
    }
  }
  
  private async tryUntrackIpfsHash(info: TrackedIpfsHashInfo): Promise<void> {
    if(info.status !== TrackedIpfsHashStatus.Pinned && info.status !== TrackedIpfsHashStatus.Unpinning) {
      this.deps.logger.log(`Stopping tracking of ${info.ipfsHash} (not a wrapper or undefined)`);
      this.deps.persistenceStateManager.removeIpfsHash(info.ipfsHash);
      return;
    } 

    const retryCount = info?.unresponsiveInfo?.retryCount || info?.unresponsiveInfo?.retryCount === 0
      ? info?.unresponsiveInfo?.retryCount + 1
      : 0;

    const success = await this.unpinWrapper(info.ipfsHash);
    if(success) {
      this.deps.persistenceStateManager.removeIpfsHash(info.ipfsHash);
    } else {
      this.scheduleRetry(info.ipfsHash, retryCount, TrackedIpfsHashStatus.Unpinning, info.indexes)
    }
  }

  private async pinWrapper(ipfsHash: string, retryCount: number, indexes: string[]): Promise<void> {
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

  private async scheduleRetry(ipfsHash: string, retryCount: number, status: TrackedIpfsHashStatus, indexes: string[]): Promise<void> {
    this.deps.logger.log(`Scheduling retry for ${ipfsHash} (${status})`);
   
    if(retryCount >= this.deps.persistenceConfig.wrapperResolution.retries.max) {
      this.deps.persistenceStateManager.setIpfsHashInfo(ipfsHash, {
        ipfsHash,
        status: TrackedIpfsHashStatus.Lost,
        previousStatus: status,
        indexes,
      });

      this.deps.logger.log(`Wrapper ${ipfsHash} is now considered lost`);
    } else {
      const startingDelayInSec = this.deps.persistenceConfig.wrapperResolution.retries.startingDelayInSec;

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
  
  private async unpinWrapper(ipfsHash: string): Promise<boolean> {
    try {
      await this.deps.ipfsNode.pin.rm(ipfsHash, {
        recursive: true,
        timeout: this.deps.ipfsConfig.unpinTimeout,
      });
  
      this.deps.logger.log(`Unpinned ${ipfsHash}`);
      return true;
    } catch (err) {
      this.deps.logger.log(`Failed to unpin ${ipfsHash}, error: ${JSON.stringify(err)}`);
      return false;
    }
  }
}

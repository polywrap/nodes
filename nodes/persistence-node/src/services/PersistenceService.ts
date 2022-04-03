import { IpfsConfig } from "../config/IpfsConfig";
import * as IPFS from 'ipfs-core';
import { Logger } from "./Logger";
import { isWrapper } from "../isWrapper";
import { TrackedIpfsHashInfo } from "../types/TrackedIpfsHashInfo";
import { addSeconds } from "../utils/addSeconds";
import { EnsStateManager } from "./EnsStateManager";
import { PersistenceStateManager } from "./PersistenceStateManager";
import { sleep } from "../sleep";
import { UnresponsiveIpfsHashInfo } from "../types/UnresponsiveIpfsHashInfo";
import { EnsIndexerApp } from "./EnsIndexerApp";

interface IDependencies {
  persistenceStateManager: PersistenceStateManager;
  ensIndexerApp: EnsIndexerApp;
  ipfsNode: IPFS.IPFS;
  ipfsConfig: IpfsConfig;
  logger: Logger;
}

export class PersistenceService {
  deps: IDependencies;

  constructor(deps: IDependencies) {
    this.deps = deps;
  }

  async run(): Promise<void> {
    while(true) {
      const state = this.deps.ensIndexerApp.getIpfsHashes(); 
      const tracked = this.deps.persistenceStateManager.getTrackedIpfsHashes();
  
      const { toTrack, toUntrack } = await this.getDifference(state, tracked);
  
      const trackTasks = toTrack.map(this.tryTrackIpfsHash.bind(this));
      const untrackTasks = toUntrack.map(this.tryUntrackIpfsHash.bind(this));
  
      await Promise.all([
        Promise.all(trackTasks), 
        Promise.all(untrackTasks)
      ]);
      await sleep(15000);
    }
  }

  async getDifference(
    state: string[],
    tracked: string[]
  ): Promise<{
    toTrack: string[], 
    toUntrack: TrackedIpfsHashInfo[]
  }> {
    const toTrack: string[] = [];
    const toUntrack: TrackedIpfsHashInfo[] = [];

    for(const ipfsHash of state) {
      if(!this.deps.persistenceStateManager.containsIpfsHash(ipfsHash)) {
        toTrack.push(ipfsHash);
      }
    }

    for(const ipfsHash of tracked) {
      if(!this.deps.ensIndexerApp.containsIpfsHash(ipfsHash)) {
        toUntrack.push(this.deps.persistenceStateManager.getTrackedIpfsHashInfo(ipfsHash));
      } else {
        const info = this.deps.persistenceStateManager.getTrackedIpfsHashInfo(ipfsHash);

        if(info?.unresponsiveInfo) {
          if(info.unresponsiveInfo.scheduledRetryDate < new Date()) {
            toTrack.push(ipfsHash);
          }
        }
      }
    }

    return {
      toTrack,
      toUntrack
    };
  }

  async tryTrackIpfsHash(ipfsHash: string): Promise<void> {
    const info = this.deps.persistenceStateManager.getTrackedIpfsHashInfo(ipfsHash);
    const retryCount = info?.unresponsiveInfo?.retryCount ?? 0;

    console.log(ipfsHash);
    if(info) {
    console.log("info");

      if(info.isPinned) {
        console.log("pinned");
        return;
      }

      if(info.isWrapper === true) {
        console.log("isWrapper");
        await this.pinCID(ipfsHash, retryCount);  
      } else if(info.isWrapper === false) {
        console.log("!isWrapper");
        return;
      } else if(info.isWrapper === undefined) {
        console.log("isWrapper undefined");
        await this.pinIfWrapper(ipfsHash, retryCount);
      }
    } else {
      await this.pinIfWrapper(ipfsHash, retryCount);
    }

    this.deps.persistenceStateManager.save();
  }
  async pinIfWrapper(ipfsHash: string, retryCount: number): Promise<void> {

    const result = await isWrapper(this.deps.ipfsNode, this.deps.ipfsConfig, this.deps.logger, ipfsHash);

    if(result === "yes") {
      console.log("is a wrapper");
      this.deps.persistenceStateManager.setIpfsHashInfo(ipfsHash, {
        ipfsHash,
        isWrapper: true,
        isPinned: false,
      });

      await this.pinCID(ipfsHash, retryCount);  
    } else if (result === "no") {
      console.log("not a wrapper");
      this.deps.persistenceStateManager.setIpfsHashInfo(ipfsHash, {
        ipfsHash,
        isWrapper: false,
        isPinned: false,
      });
    } else if (result === "timeout") {
      console.log("timed out check if wrapper");
      this.deps.persistenceStateManager.setIpfsHashInfo(ipfsHash, {
        ipfsHash,
        isPinned: false,
        unresponsiveInfo: scheduleRetry(retryCount)
      });
    }
  }
  
  async tryUntrackIpfsHash(info: TrackedIpfsHashInfo): Promise<void> {
    if(!info.isWrapper) {
      this.deps.persistenceStateManager.removeIpfsHash(info.ipfsHash);
      return;
    }

    const success = await this.unpinCID(info.ipfsHash);
    if(success) {
      this.deps.persistenceStateManager.removeIpfsHash(info.ipfsHash);
    }
    //If failed to unpin, we will try again later
    this.deps.persistenceStateManager.save();
  }

  async pinCID(cid: string, retryCount: number): Promise<void> {
    this.deps.logger.log(`Pinning ${cid}...`);
   
    try {
      await this.deps.ipfsNode.pin.add(cid, {
        timeout: this.deps.ipfsConfig.pinTimeout,
      });

      this.deps.persistenceStateManager.setIpfsHashInfo(cid, {
        ipfsHash: cid,
        isWrapper: true,
        isPinned: true,
      });
  
      this.deps.logger.log(`Pinned ${cid}`);
      
    } catch (err) {
      this.deps.logger.log(JSON.stringify(err));
     
      this.deps.persistenceStateManager.setIpfsHashInfo(cid, {
        ipfsHash: cid,
        isWrapper: true,
        isPinned: false,
        unresponsiveInfo: scheduleRetry(retryCount)
      });
    }
  }
  
  async unpinCID(cid: string): Promise<boolean> {
    try {
      await this.deps.ipfsNode.pin.rm(cid, {
        timeout: this.deps.ipfsConfig.unpinTimeout,
      });
  
      this.deps.logger.log(`Unpinned ${cid}`);
        return true;
    } catch (err) {
      this.deps.logger.log(JSON.stringify(err));
      return false;
    }
  }
}

const scheduleRetry = (retryCount: number): UnresponsiveIpfsHashInfo => {
  return {
    scheduledRetryDate: addSeconds(new Date(), 60*Math.pow(2, retryCount)),
    retryCount: retryCount + 1,
  };
};
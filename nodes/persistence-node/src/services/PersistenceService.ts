import { IpfsConfig } from "../config/IpfsConfig";
import * as IPFS from 'ipfs-core';
import { Logger } from "./Logger";
import { isWrapper } from "../isWrapper";
import { TrackedIpfsHashInfo } from "../types/TrackedIpfsHashInfo";
import { addSeconds } from "../utils/addSeconds";
import { PersistenceStateManager } from "./PersistenceStateManager";
import { sleep } from "../sleep";
import { UnresponsiveIpfsHashInfo } from "../types/UnresponsiveIpfsHashInfo";
import { IndexRetriever } from "./IndexRetriever";
import { IPFSIndex } from "../types/IPFSIndex";

interface IDependencies {
  persistenceStateManager: PersistenceStateManager;
  ipfsNode: IPFS.IPFS;
  ipfsConfig: IpfsConfig;
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
      const indexes = await this.deps.indexRetriever.getCIDs(); 
      const tracked = this.deps.persistenceStateManager.getTrackedIpfsHashInfos();
  
      const { toTrack, toUntrack } = await this.getDifference(indexes, tracked);
  
      const trackTasks = toTrack.map(this.tryTrackIpfsHash.bind(this));
      const untrackTasks = toUntrack.map(this.tryUntrackIpfsHash.bind(this));
  
      this.deps.logger.log(`${toTrack.length} wrappers to track, ${toUntrack.length} to untrack`);

      await Promise.all([
        Promise.all(trackTasks), 
        Promise.all(untrackTasks)
      ]);
      await sleep(15000);
    }
  }

  async getDifference(
    indexes: IPFSIndex[],
    trackedInfos: TrackedIpfsHashInfo[]
  ): Promise<{
    toTrack: {
      ipfsHash: string,
      indexes: string[]
    }[], 
    toUntrack: TrackedIpfsHashInfo[]
  }> {
    const indexedIpfsMap: Record<string, Set<string>> = {};

    const toTrackMap: Record<string, boolean> = {};
    const toUntrack: TrackedIpfsHashInfo[] = [];

    //Go through all CIDs of all indexes and add to "toTrack" 
    //if they're not already being tracked
    for(const index of indexes) {
      for(const cid of index.cids) {
        if(!this.deps.persistenceStateManager.containsIpfsHash(cid)) {
          toTrackMap[cid] = true;
        }

        //Add to shorten lookup later
        indexedIpfsMap[cid] = !indexedIpfsMap[cid]
          ? new Set([index.name])
          : new Set(indexedIpfsMap[cid].add(index.name));
      }
    }

    const unresponsiveIndexMap: Record<string, boolean> = {};
    for (const index of indexes) {
      if(index.error) {
        unresponsiveIndexMap[index.name] = true;
      }
    }

    //Go through all tracked CIDs and add to "toUntrack" if they're not in the indexes,
    //provided the index was able to be retrieved
    //If they are in an index and they're logged as unresponsive, check if their scheduledRetryDate is past
    //if true, add to "toTrack"
    for(const info of trackedInfos) {
      //If the IPFS hash is not in any index
      if(!indexedIpfsMap[info.ipfsHash]) {
        //Untrack the IPFS hash unless the index for which it was previously logged for is not able to be retrieved
        if(!info.indexes.some(x => unresponsiveIndexMap[x])) {
          toUntrack.push(this.deps.persistenceStateManager.getTrackedIpfsHashInfo(info.ipfsHash));
        }
      } else {
        if(info?.unresponsiveInfo) {
          if(new Date(info.unresponsiveInfo.scheduledRetryDate) < new Date()) {
            toTrackMap[info.ipfsHash] = true;
          }
        }

        //Add all indexes which were returned this IPFS hash
        const updatedIndexes: Set<string> = new Set(indexedIpfsMap[info.ipfsHash]);
        
        //Also add all unresponsive indexes which were present in the info before
        //If an index is unresponsive, it does not mean it does not have the IPFS hash
        for(const index of info.indexes) {
          if(unresponsiveIndexMap[index]) {
            updatedIndexes.add(index);
          }
        }

        info.indexes = [...updatedIndexes];
      }
    }

    this.deps.persistenceStateManager.save();

    const ipfsHashesToTrack = Object.keys(toTrackMap).map(x => x);
    const toTrack: {
      ipfsHash: string,
      indexes: string[]
    }[] = [];

    for(const ipfsHash of ipfsHashesToTrack) {
      toTrack.push({
        ipfsHash,
        indexes: [...indexedIpfsMap[ipfsHash]]
      });
    }

    return {
      toTrack,
      toUntrack
    };
  }

  async tryTrackIpfsHash(ipfsHashToTrack: {
    ipfsHash: string,
    indexes: string[]
  }): Promise<void> {
    const { ipfsHash, indexes } = ipfsHashToTrack;

    const info = this.deps.persistenceStateManager.getTrackedIpfsHashInfo(ipfsHash);
    const retryCount = info?.unresponsiveInfo?.retryCount ?? 0;

    if(info) {
      if(info.isPinned) {
        return;
      }

      if(info.isWrapper === true) {
        await this.pinCID(ipfsHash, retryCount, indexes);  
      } else if(info.isWrapper === false) {
        return;
      } else if(info.isWrapper === undefined) {
        await this.pinIfWrapper(ipfsHash, retryCount, indexes);
      }
    } else {
      await this.pinIfWrapper(ipfsHash, retryCount, indexes);
    }
  }
  async pinIfWrapper(ipfsHash: string, retryCount: number, indexes: string[]): Promise<void> {

    const result = await isWrapper(this.deps.ipfsNode, this.deps.ipfsConfig, this.deps.logger, ipfsHash);

    if(result === "yes") {
      await this.deps.persistenceStateManager.setIpfsHashInfo(ipfsHash, {
        ipfsHash,
        isWrapper: true,
        isPinned: false,
        indexes,
      });

      await this.pinCID(ipfsHash, retryCount, indexes);  
    } else if (result === "no") {
      await this.deps.persistenceStateManager.setIpfsHashInfo(ipfsHash, {
        ipfsHash,
        isWrapper: false,
        isPinned: false,
        indexes,
      });
    } else if (result === "timeout") {
      await this.deps.persistenceStateManager.setIpfsHashInfo(ipfsHash, {
        ipfsHash,
        isPinned: false,
        indexes,
        unresponsiveInfo: scheduleRetry(retryCount)
      });
    }
  }
  
  async tryUntrackIpfsHash(info: TrackedIpfsHashInfo): Promise<void> {
    if(!info.isWrapper) {
      this.deps.logger.log(`Stopping tracking of ${info.ipfsHash} (not a wrapper)`);
      this.deps.persistenceStateManager.removeIpfsHash(info.ipfsHash);
      return;
    } 

    const success = await this.unpinCID(info.ipfsHash);
    if(success) {
      this.deps.persistenceStateManager.removeIpfsHash(info.ipfsHash);
    }
    //If failed to unpin, we will try again later
  }

  async pinCID(cid: string, retryCount: number, indexes: string[]): Promise<void> {
    this.deps.logger.log(`Pinning ${cid}...`);
   
    try {
      await this.deps.ipfsNode.pin.add(cid, {
        timeout: this.deps.ipfsConfig.pinTimeout,
      });

      this.deps.persistenceStateManager.setIpfsHashInfo(cid, {
        ipfsHash: cid,
        isWrapper: true,
        isPinned: true,
        indexes
      });
  
      this.deps.logger.log(`Pinned ${cid}`);
      
    } catch (err) {
      this.deps.logger.log(JSON.stringify(err));
     
      this.deps.persistenceStateManager.setIpfsHashInfo(cid, {
        ipfsHash: cid,
        isWrapper: true,
        isPinned: false,
        indexes,
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
      this.deps.logger.log(`Failed to unpin ${cid}, error: ${JSON.stringify(err)}`);
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
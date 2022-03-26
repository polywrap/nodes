import { IpfsConfig } from "../config/IpfsConfig";
import { EnsState } from "../types/EnsState";
import { PersistenceState, TrackedIpfsHashInfo } from "../types/PersistenceState";
import * as IPFS from 'ipfs-core';
import { Logger } from "./Logger";
import { isWrapper } from "../isWrapper";

interface IDependencies {
  ensState: EnsState;
  persistenceState: PersistenceState;
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
    const state = this.deps.ensState.ipfsEns.keys(); 
    const tracked = this.deps.persistenceState.trackedIpfsHashes.keys();

    const { toTrack, toUntrack } = await this.getDifference(state, tracked);

    const trackTasks = toTrack.map(this.tryTrackIpfsHash.bind(this));
    const untrackTasks = toUntrack.map(this.tryUntrackIpfsHash.bind(this));

    await Promise.all([
      Promise.all(trackTasks), 
      Promise.all(untrackTasks)
    ]);
  }

  async getDifference(
    state: IterableIterator<string>, 
    tracked: IterableIterator<string>
  ): Promise<{
    toTrack: string[], 
    toUntrack: TrackedIpfsHashInfo[]
  }> {
    const toTrack: string[] = [];
    const toUntrack: TrackedIpfsHashInfo[] = [];

    for(const ipfsHash of state) {
      if(!this.deps.persistenceState.trackedIpfsHashes.has(ipfsHash)) {
        toTrack.push(ipfsHash);

        this.deps.persistenceState.unresponsiveIpfsHashes.delete(ipfsHash);
      }
    }

    for(const ipfsHash of tracked) {
      if(!this.deps.ensState.ipfsEns.has(ipfsHash)) {
        toUntrack.push(this.deps.persistenceState.trackedIpfsHashes.get(ipfsHash) as TrackedIpfsHashInfo);
      
        this.deps.persistenceState.unresponsiveIpfsHashes.delete(ipfsHash);
      }
    }

    return {
      toTrack,
      toUntrack
    };
  }

  async tryTrackIpfsHash(ipfsHash: string): Promise<void> {
    const result = await isWrapper(this.deps.ipfsNode, this.deps.ipfsConfig, this.deps.logger, ipfsHash);

    if(result === "yes") {
      this.deps.persistenceState.trackedIpfsHashes.set(ipfsHash, {
        ipfsHash,
        isWrapper: true,
        isPinned: false,
        isUnresponsive: false
      });

      const success = await this.pinCID(this.deps.ipfsNode, this.deps.ipfsConfig, ipfsHash);  

      if(success) {
        this.deps.persistenceState.trackedIpfsHashes.set(ipfsHash, {
          ipfsHash,
          isWrapper: true,
          isPinned: true,
          isUnresponsive: false
        });
      } else {
        this.deps.persistenceState.trackedIpfsHashes.set(ipfsHash, {
          ipfsHash,
          isWrapper: true,
          isPinned: false,
          isUnresponsive: true
        });
      }
    } else if (result === "no") {
      this.deps.persistenceState.trackedIpfsHashes.set(ipfsHash, {
        ipfsHash,
        isWrapper: false,
        isPinned: false,
        isUnresponsive: false
      });
    } else if (result === "timeout") {
      this.deps.persistenceState.trackedIpfsHashes.set(ipfsHash, {
        ipfsHash,
        isPinned: false,
        isUnresponsive: true
      });
    }
  }

  async tryUntrackIpfsHash(info: TrackedIpfsHashInfo): Promise<void> {
    if(!info.isWrapper) {
      this.deps.persistenceState.trackedIpfsHashes.delete(info.ipfsHash);
      return;
    }

    const success = await this.unpinCID(info.ipfsHash);
    if(success) {
      this.deps.persistenceState.trackedIpfsHashes.delete(info.ipfsHash);
    }
    //If failed to unpin, we will try again later
  }

  async pinCID(ipfs: IPFS.IPFS, ipfsConfig: IpfsConfig, cid: string): Promise<boolean> {
    this.deps.logger.log(`Pinning ${cid}...`);
   
    try {
      await ipfs.pin.add(cid, {
        timeout: ipfsConfig.pinTimeout,
      });
  
      this.deps.logger.log(`Pinned ${cid}`);
      return true;
    } catch (err) {
      this.deps.logger.log(JSON.stringify(err));
      return false;
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
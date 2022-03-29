import fs from 'fs';
import { PersistenceState } from '../types/PersistenceState';
import { TrackedIpfsHashInfo } from '../types/TrackedIpfsHashInfo';

const persistenceStateFilePath = './persistence-state.json';

export class PersistenceStateManager {
  state: PersistenceState = {
    trackedIpfsHashes: {}
  };
    
  getTrackedIpfsHashes(): string[] {
    return Object.keys(this.state.trackedIpfsHashes);
  }

  getTrackedIpfsHashInfos(): TrackedIpfsHashInfo[] {
    return Object.values(this.state.trackedIpfsHashes);
  }
  
  getTrackedIpfsHashInfo(ipfsHash: string): TrackedIpfsHashInfo {
    return this.state.trackedIpfsHashes[ipfsHash];
  }

  containsIpfsHash(ipfsHash: string): boolean {
    return !!this.state.trackedIpfsHashes[ipfsHash];
  }

  setIpfsHashInfo(ipfsHash: string, info: TrackedIpfsHashInfo) {
    this.state.trackedIpfsHashes[ipfsHash] = info;
  }

  removeIpfsHash(ipfsHash: string): void {
    delete this.state.trackedIpfsHashes[ipfsHash];
  }

  async save(): Promise<void> {
    fs.writeFileSync(persistenceStateFilePath, JSON.stringify(this.state, null, 2));
  }

  async load(): Promise<void> {
    if (!fs.existsSync(persistenceStateFilePath)) {
      await this.save();
    }

    this.state = JSON.parse(fs.readFileSync(persistenceStateFilePath, 'utf8'));
  }
}
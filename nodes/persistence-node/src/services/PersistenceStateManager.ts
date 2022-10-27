import fs from "fs";
import { PersistenceState } from "../types/PersistenceState";
import { TrackedIpfsHashInfo } from "../types/TrackedIpfsHashInfo";
import path from "path";

const persistenceStateFilePath = "./persistence-state.json";


interface IDependencies {
  dataDirPath: string;
}

export class PersistenceStateManager {
  state: PersistenceState = {
    trackedIpfsHashes: {}
  };

  constructor(private readonly deps: IDependencies) {
  }

  get stateFilePath(): string {
    return path.join(this.deps.dataDirPath, persistenceStateFilePath);
  }
    
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

  async setIpfsHashInfo(ipfsHash: string, info: TrackedIpfsHashInfo): Promise<TrackedIpfsHashInfo> {
    this.state.trackedIpfsHashes[ipfsHash] = info;
    await this.save();
    return info;
  }

  async removeIpfsHash(ipfsHash: string): Promise<void> {
    delete this.state.trackedIpfsHashes[ipfsHash];
    await this.save();
  }

  async load(): Promise<void> {
    if (!fs.existsSync(this.stateFilePath)) {
      await this.save();
    }

    this.state = JSON.parse(fs.readFileSync(this.stateFilePath, 'utf8'));
  }

  public async save(): Promise<void> {
    fs.writeFileSync(this.stateFilePath, JSON.stringify(this.state, null, 2));
  }
}
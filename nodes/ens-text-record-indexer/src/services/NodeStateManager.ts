import fs from "fs";
import path from "path";
import { EthereumNetwork } from "./EthereumNetwork";

interface IDependencies {
  ethereumNetwork: EthereumNetwork;
  dataDirPath: string;
}

export class NodeStateManager {
  state = {
    fastSync: {
      lastIpfsHash: "", 
    }
  };

  constructor(private readonly deps: IDependencies) {
  }

  get stateFilePath(): string {
    return path.join(this.deps.dataDirPath, `./node-state.json`);
  }

  async updateLastIpfsHashForFastSync(ipfsHash: string): Promise<void> {
    this.state.fastSync.lastIpfsHash = ipfsHash;
    await this.save();
  }

  lastIpfsHashForFastSync(): string {
    return this.state.fastSync.lastIpfsHash;
  }

  async save(): Promise<void> {
    fs.writeFileSync(this.stateFilePath, JSON.stringify(this.state, null, 2));
  }

  async load(): Promise<void> {
    if (!fs.existsSync(this.stateFilePath)) {
      await this.save();
    }

    this.state = JSON.parse(fs.readFileSync(this.stateFilePath, 'utf8'));
  }
}
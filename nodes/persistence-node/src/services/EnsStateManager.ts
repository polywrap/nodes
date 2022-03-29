import fs from 'fs';
import { EnsState } from "../types/EnsState";

export class EnsStateManager {
  state: EnsState = {
    ensIpfs: {},
    ipfsEns: {},
    lastBlockNumber: 0,
  };

  get lastBlockNumber(): number {
    return this.state.lastBlockNumber;
  }
  set lastBlockNumber(newBlockNumber: number) {
    this.state.lastBlockNumber = newBlockNumber;
  } 

  containsIpfsHash(ipfsHash: string): boolean {
    return !!this.state.ipfsEns[ipfsHash];
  }

  getIpfsHashes(): string[] {
    return Object.keys(this.state.ipfsEns);
  }

  update(ensNode: string, newIpfsHash: string | undefined) {
    const prevIpfsHash = this.state.ensIpfs[ensNode];

    if(prevIpfsHash) {
      const ensMap = this.state.ipfsEns[prevIpfsHash];
      if(ensMap) {
        delete ensMap[ensNode];
  
        //TODO: fix this
        if(Object.keys(ensMap).length == 0) {
          delete this.state.ipfsEns[prevIpfsHash];
        }
      } 
    }

    if(newIpfsHash) {
      this.state.ensIpfs[ensNode] = newIpfsHash;

      let newEnsMap = this.state.ipfsEns[newIpfsHash];

      if(newEnsMap) {
        newEnsMap[ensNode] = true;
      } else {
        newEnsMap = {
          [ensNode]: true,
       };
  
        this.state.ipfsEns[newIpfsHash] = newEnsMap;
      }
    }
  
    this.save();
  }

  async save(): Promise<void> {
    fs.writeFileSync('./ens-state.json', JSON.stringify(this.state, null, 2));
  }

  async load(): Promise<void> {
    if (!fs.existsSync('./ens-state.json')) {
      await this.save();
    }

    this.state = JSON.parse(fs.readFileSync('./ens-state.json', 'utf8'));
  }
}
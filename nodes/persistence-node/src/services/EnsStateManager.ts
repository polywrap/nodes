import { EnsState } from "../types/EnsState";

interface IDependencies {
  ensState: EnsState;
}

export class EnsStateManager {
  deps: IDependencies;

  constructor(deps: IDependencies) {
    this.deps = deps;
  }

  update(ensNode: string, newIpfsHash: string | undefined) {
    const prevIpfsHash = this.deps.ensState.ensIpfs.get(ensNode);

    if(prevIpfsHash) {
      const ensMap = this.deps.ensState.ipfsEns.get(prevIpfsHash);
      if(ensMap) {
        ensMap.delete(ensNode);
  
        if(ensMap.size == 0) {
          this.deps.ensState.ipfsEns.delete(prevIpfsHash);
        }
      } 
    }

    if(newIpfsHash) {
      this.deps.ensState.ensIpfs.set(ensNode, newIpfsHash);

      let newEnsMap = this.deps.ensState.ipfsEns.get(newIpfsHash);

      if(newEnsMap) {
        newEnsMap.set(ensNode, true);
      } else {
        newEnsMap = new Map();
        newEnsMap.set(ensNode, true);
  
        this.deps.ensState.ipfsEns.set(newIpfsHash, newEnsMap);
      }
    }
  }
}
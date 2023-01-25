import fs from "fs";
import path from "path";
import { EnsState } from "../types/EnsState";
import { SavedEnsState } from "../types/SavedEnsState";
import { getIpfsHashFromContenthash } from "../utils/getIpfsHashFromContenthash";
import { EthereumNetwork } from "./EthereumNetwork";


interface IDependencies {
  ethereumNetwork: EthereumNetwork;
  dataDirPath: string;
}

export class EnsStateManager {
  state: EnsState = {
    ensContenthash: {},
    contenthashEns: {},
    lastBlockNumber: 0,
    lastBlockNumberProcessed: 0,
    isFullySynced: false,
  };

  constructor(private readonly deps: IDependencies) {
  }

  get chainId(): number {
    return this.deps.ethereumNetwork.chainId;
  }

  get stateFilePath(): string {
    return path.join(this.deps.dataDirPath, `./ens-state.${this.deps.ethereumNetwork.name}.json`);
  }

  get prebuiltStateFilePath(): string {
    return path.join(`${__dirname}/../prebuilt-state/ens-state.${this.deps.ethereumNetwork.name}.prebuilt.json`);
  }

  get lastBlockNumber(): number {
    return this.state.lastBlockNumber;
  }
  set lastBlockNumber(newBlockNumber: number) {
    this.state.lastBlockNumber = newBlockNumber;
  } 

  containsIpfsHash(ipfsHash: string): boolean {
    return !!this.state.contenthashEns[ipfsHash];
  }

  getIpfsCIDs(): string[] {
    return Object.keys(this.state.contenthashEns)
      .map(getIpfsHashFromContenthash)
      .filter(x => !!x)
      .map(x => x as string);
  }

  getIpfsCIDsWithEnsNodes(): {
    cid: string,
    ensNodes: string[]
  }[] {
    return Object.keys(this.state.contenthashEns)
      .map(contenthash => {
        let nodesMap = this.state.contenthashEns[contenthash];
        let cid = getIpfsHashFromContenthash(contenthash);

        return cid
          ? {
              cid,
              ensNodes: Object.keys(nodesMap).filter(node => nodesMap[node])
            }
          : undefined;
      })
      .filter(x => !!x)
      .map(x => x as {
        cid: string,
        ensNodes: string[]
      });
  }

  getState(): SavedEnsState {
    return {
      ensContenthash: this.state.ensContenthash,
      lastBlockNumber: this.state.lastBlockNumber,
      contenthashEns: this.state.contenthashEns,
      isFullySynced: this.state.isFullySynced,
    };
  }

  updateState(state: SavedEnsState) {
    const newState: EnsState = {
      ensContenthash: state.ensContenthash,
      contenthashEns: {},
      lastBlockNumber: state.lastBlockNumber,
      lastBlockNumberProcessed: state.lastBlockNumber - 1,
      isFullySynced: state.isFullySynced,
    };

    for (const [ensNode, contenthash] of Object.entries(state.ensContenthash)) {
      const ensMap = newState.contenthashEns[contenthash];

      if(!ensMap) {
        newState.contenthashEns[contenthash] = {
          [ensNode]: true,
        };
      } else {
        ensMap[ensNode] = true;
      }
    }

    this.state = newState;
    this.save();
  }

  getContenthashes(): string[] {
    return Object.keys(this.state.contenthashEns);
  }

  update(ensNode: string, newContenthash: string | undefined) {
    const prevContenthash = this.state.ensContenthash[ensNode];

    if(prevContenthash) {
      const ensMap = this.state.contenthashEns[prevContenthash];
      if(ensMap) {
        delete ensMap[ensNode];
  
        //TODO: fix this
        if(Object.keys(ensMap).length == 0) {
          delete this.state.contenthashEns[prevContenthash];
        }
      } 
    }

    if(newContenthash) {
      this.state.ensContenthash[ensNode] = newContenthash;

      let newEnsMap = this.state.contenthashEns[newContenthash];

      if(newEnsMap) {
        newEnsMap[ensNode] = true;
      } else {
        newEnsMap = {
          [ensNode]: true,
       };
  
        this.state.contenthashEns[newContenthash] = newEnsMap;
      }
    }
  
    this.save();
  }

  async init(): Promise<void> {
    fs.writeFileSync(this.stateFilePath, JSON.stringify(this.state, null, 2));
  }

  async save(): Promise<void> {
    fs.writeFileSync(this.stateFilePath, JSON.stringify(this.state, null, 2));
  }

  async load(): Promise<void> {
    if (!fs.existsSync(this.stateFilePath)) {
      if (fs.existsSync(this.prebuiltStateFilePath)) {
        fs.copyFileSync(this.prebuiltStateFilePath, this.stateFilePath);
      } else {
        await this.save();
      }
    }

    this.state = JSON.parse(fs.readFileSync(this.stateFilePath, 'utf8'));
  }
}
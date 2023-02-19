import fs from "fs";
import path from "path";
import { EnsState } from "../types/EnsState";
import { SavedEnsState } from "../types/SavedEnsState";
import { EthereumNetwork } from "./EthereumNetwork";
import { TextRecordValue } from "../types/TextRecordValue";
import { EnsTextRecord } from "../types/EnsTextRecord";
import { Queue } from "../types/Queue";

interface IDependencies {
  ethereumNetwork: EthereumNetwork;
  dataDirPath: string;
  recordsToProcess: Queue<EnsTextRecord>;
}

export class EnsStateManager {
  state: EnsState = {
    ensRecordKeys: {},
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

  recordExists(ensNode: string, key: string): boolean {
    return this.state.ensRecordKeys[ensNode] && !!this.state.ensRecordKeys[ensNode][key];
  }

  getRecordKeys(): string[] {
    return Object.values(this.state.ensRecordKeys)
      .filter(x => !!x)
      .flatMap(x => Object.keys(x));
  }

  getEnsTextRecords(): { 
    node: string, 
    textRecords: { key: string, value: string }[] 
  }[] {
    return Object.entries(this.state.ensRecordKeys)
      .filter(x => !!x)
      .map(([ensNode, keys]) => ({ 
        node: ensNode, 
        textRecords: Object.keys(keys)
          .filter(key => keys[key].value)
          .map(key => ({ key, value: keys[key].value as string }))
      }));
  }
    
  getWrapEnsTextRecords(): { 
    node: string, 
    textRecords: { key: string, value: string }[] 
  }[] {
    return Object.entries(this.state.ensRecordKeys)
      .filter(x => !!x)
      .map(([ensNode, keys]) => ({ 
        node: ensNode, 
        textRecords: Object.keys(keys)
          .filter(key => key.startsWith("wrap/"))
          .filter(key => keys[key].value)
          .map(key => ({ key, value: keys[key].value as string }))
      })).filter(x => x.textRecords.length);
  }

  getState(): SavedEnsState {
    return {
      ensRecordKeys: this.state.ensRecordKeys,
      lastBlockNumber: this.state.lastBlockNumber,
      isFullySynced: this.state.isFullySynced,
    };
  }

  updateState(state: SavedEnsState) {
    const newState: EnsState = {
      ensRecordKeys: state.ensRecordKeys,
      lastBlockNumber: state.lastBlockNumber,
      lastBlockNumberProcessed: state.lastBlockNumber - 1,
      isFullySynced: state.isFullySynced,
    };

    this.state = newState;
    this.save();
  }

  update(ensNode: string, newKey: string | undefined) {
    const keys: Record<string, TextRecordValue> = this.state.ensRecordKeys[ensNode];

    if(keys) {
      if (newKey) {
        keys[newKey] = {};
        this.deps.recordsToProcess.enqueue({
          ensNode,
          key: newKey,
        });
      } else if (Object.keys(keys).length === 0) {
        delete this.state.ensRecordKeys[ensNode];
      }
    } else {
      if(newKey) {
        this.state.ensRecordKeys[ensNode] = {
          [newKey]: {},
        };
        this.deps.recordsToProcess.enqueue({
          ensNode,
          key: newKey,
        });
      }
    }
  }

  async updateValue(ensNode: string, key: string, value: string | undefined) {
    const keys: Record<string, TextRecordValue> = this.state.ensRecordKeys[ensNode];

    if(keys) {
      if (value) {
        keys[key] = {
          value,
        };
      } else {
        delete keys[key];
      }
      
      if (Object.keys(keys).length === 0) {
        delete this.state.ensRecordKeys[ensNode];
      }
    } else {
      if(value) {
        this.state.ensRecordKeys[ensNode] = {
          [key]: { value },
        };
      }
    }
  }

  save() {
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

    for (const [ensNode, keys] of Object.entries(this.state.ensRecordKeys)) {
      for (const key of Object.keys(keys)) {
        if (keys[key] && !keys[key].value) {
          this.deps.recordsToProcess.enqueue({
            ensNode,
            key,
          });
        }
      }
    }
    console.log(`Queue length: ${this.deps.recordsToProcess.length}`);
  }
}
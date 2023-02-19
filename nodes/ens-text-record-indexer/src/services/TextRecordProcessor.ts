import { EthereumNetwork } from "./EthereumNetwork";
import { Queue } from "../types/Queue";
import { sleep } from "../utils/sleep";
import { EnsStateManager } from "./EnsStateManager";
import { EnsTextRecord } from "../types/EnsTextRecord";
import { Contract, Provider } from "ethers-multicall";
import { EnsNetworkConfig } from "../config/EnsNetworkConfig";
import { toUtf8StringOrUndefined } from "../utils/toUtf8StringOrUndefined";

const MAX_BULK_TEXT_RECORD_REQUEST_SIZE = 100;

interface IDependencies {
  ethereumNetwork: EthereumNetwork;
  dataDirPath: string;
  ensStateManager: EnsStateManager;
  recordsToProcess: Queue<EnsTextRecord>;
  ensNetworkConfig: EnsNetworkConfig;
  multiCallProvider: Provider;
}

export class TextRecordProcessor {
  constructor(private readonly deps: IDependencies) {
  }

  async run(): Promise<void> {
    while (true) {
      const bulk: EnsTextRecord[] = [];
      while (this.deps.recordsToProcess.peek()) {
        const record = this.deps.recordsToProcess.dequeue();
        if (!record) {
          break;
        }

        if (this.deps.ensStateManager.recordExists(record.ensNode, record.key)) {
          bulk.push(record);
          if (bulk.length >= MAX_BULK_TEXT_RECORD_REQUEST_SIZE) {
            break;
          }
        }
      }
      if (bulk.length) {
        await this.processBulk(bulk);
        await sleep(15);
      } else {
        await sleep(1000);
      }
    }
  }

  async processBulk(records: EnsTextRecord[]): Promise<void> {
    const resolver = new Contract(
      this.deps.ensNetworkConfig.resolverAddr,
      this.deps.ensNetworkConfig.resolverAbi
    );

    const values: string[] = await this.deps.multiCallProvider.all(
      records.map(record => resolver.text(record.ensNode, record.key))
    );

    records.forEach((record, index) => {
      this.deps.ensStateManager.updateValue(record.ensNode, record.key, toUtf8StringOrUndefined(values[index]));
    });
    this.deps.ensStateManager.save();
  }
}

import { IndexConfig } from "../types/IndexConfig";
import { Config } from "./Config";

export class IndexerConfig {
  indexes: IndexConfig[];
  ensTextRecordIndexes: IndexConfig[];

  constructor({ config }: { config: Config }) {
    this.indexes = config.indexes;
    this.ensTextRecordIndexes = config.ensTextRecordIndexes;
  }
}

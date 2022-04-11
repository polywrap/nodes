import { IPFSIndexConfig } from "../types/IPFSIndexConfig";
import { Config } from "./Config";

export class IndexerConfig {
  indexes: IPFSIndexConfig[];

  constructor({ config }: { config: Config }) {
    this.indexes = config.indexes;
  }
}

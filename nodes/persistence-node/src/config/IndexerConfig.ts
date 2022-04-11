import { IPFSIndexConfig } from "../types/IPFSIndexConfig";
import config from "./config.json";

export class IndexerConfig {
  indexes: IPFSIndexConfig[] = config.indexes;
}

import { isValidUrl } from "../utils/isValidUrl";
import config from "./config.json";

export class IndexerConfig {
  indexers: string[] = config.indexers;
}
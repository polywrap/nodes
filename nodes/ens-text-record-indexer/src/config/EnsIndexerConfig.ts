import { Config } from "./Config";

export class EnsIndexerConfig {
  maxBlockRangePerRequest: number;
  requestInterval: number;
  constructor({ config }: { config: Config }) {
    this.maxBlockRangePerRequest = config.maxBlockRangePerRequest;
    this.requestInterval = config.requestInterval;
  }
}

import { isValidUrl } from "../utils/isValidUrl";
import { Config } from "./Config";

export class PersistenceConfig {
  wrapperResolution: {
    retries: {
        max: number,
        startingDelayInSec: number
    }
  };
  persistenceMaxParallelTaskCount: number;
  persistenceIntervalSeconds: number;

  constructor({ config }: { config: Config }) {
    this.wrapperResolution = config.wrapperResolution;
    this.persistenceMaxParallelTaskCount = config.persistenceMaxParallelTaskCount;
    this.persistenceIntervalSeconds = config.persistenceIntervalSeconds;
  }
}
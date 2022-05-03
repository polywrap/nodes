import { isValidUrl } from "../utils/isValidUrl";
import { Config } from "./Config";

export class PersistenceConfig {
  wrapperResolution: {
    retries: {
        max: number,
        startingDelayInSec: number
    }
  };

  constructor({ config }: { config: Config }) {
    this.wrapperResolution = config.wrapperResolution;
  }
}
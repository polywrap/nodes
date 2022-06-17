import { WrapperConstraints } from "@web3api/core-validation";
import { Config } from "./Config";
import { WrapperConfig } from "./WrapperConfig";

export class PersistenceConfig {
  wrapper: WrapperConfig;
  persistenceMaxParallelTaskCount: number;
  persistenceIntervalSeconds: number;

  constructor({ config }: { config: Config }) {
    this.wrapper = config.wrapper;
    this.persistenceMaxParallelTaskCount = config.persistenceMaxParallelTaskCount;
    this.persistenceIntervalSeconds = config.persistenceIntervalSeconds;
  }
}
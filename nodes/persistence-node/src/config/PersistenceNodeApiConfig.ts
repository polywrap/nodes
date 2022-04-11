import { Config } from "./Config";

export class PersistenceNodeApiConfig {
  adminRpcApiPort: number;

  constructor({ config }: { config: Config }) {
    this.adminRpcApiPort = config.adminRpcApiPort;
  }
}

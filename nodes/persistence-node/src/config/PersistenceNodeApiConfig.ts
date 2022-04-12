import { Config } from "./Config";

export class PersistenceNodeApiConfig {
  apiPort: number;
  gatewayPort: number;

  constructor({ config }: { config: Config }) {
    this.apiPort = config.apiPort;
    this.gatewayPort = config.gatewayPort;
  }
}

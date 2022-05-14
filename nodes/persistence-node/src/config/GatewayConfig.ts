import { Config } from "./Config";

export class GatewayConfig {
  port: number;
  requestTimeout: number;
  ipfsTimeout: number;

  constructor(config: Config, port?: number) {
    this.port = port
      ? port
      : config.gateway.port;

    this.requestTimeout = config.gateway.requestTimeout;
    this.ipfsTimeout = config.gateway.ipfsTimeout;
  }
}

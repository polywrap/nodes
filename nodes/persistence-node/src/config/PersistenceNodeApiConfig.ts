import config from "./config.json";

export class PersistenceNodeApiConfig {
  adminRpcApiPort = config.adminRpcApiPort ?? 6051;
}

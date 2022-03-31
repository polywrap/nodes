import config from "./config.json";

export class PersistenceNodeApiConfig {
  adminRpcApiPort = config.persistenceNode.adminRpcApiPort ?? 6051;
}

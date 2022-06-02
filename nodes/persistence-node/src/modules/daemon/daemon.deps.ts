import * as awilix from "awilix";
import { NameAndRegistrationPair } from "awilix";
import { createIpfsNode } from "../../createIpfsNode";
import { Logger } from "../../services/Logger";
import { IPFS } from "ipfs-core";
import { IpfsConfig } from "../../config/IpfsConfig";
import { PersistenceService } from "../../services/persistence-service/PersistenceService";
import { PersistenceStateManager } from "../../services/PersistenceStateManager";
import { IndexerConfig } from "../../config/IndexerConfig";
import { IndexRetriever } from "../../services/IndexRetriever";
import { LoggerConfig } from "../../config/LoggerConfig";
import { Config } from "../../config/Config";
import { GatewayServer } from "../../services/gateway-server/GatewayServer";
import { ApiServer } from "../../services/ApiServer";
import { PersistenceConfig } from "../../config/PersistenceConfig";
import { GatewayConfig } from "../../config/GatewayConfig";

export interface MainDependencyContainer {
  dataDirPath: string;
  config: Config;
  apiPort: number;
  ipfsConfig: IpfsConfig;
  loggerConfig: LoggerConfig;
  indexerConfig: IndexerConfig;
  persistenceConfig: PersistenceConfig;
  gatewayConfig: GatewayConfig;

  logger: Logger;
  ipfsNode: IPFS;

  gatewayServer: GatewayServer;
  apiServer: ApiServer;
  persistenceService: PersistenceService;
  persistenceStateManager: PersistenceStateManager;
  indexRetriever: IndexRetriever;
}

export const buildMainDependencyContainer = async (
  dataDirPath: string,
  config: Config,
  apiPort?: number,
  gatewayPort?: number,
  extensionsAndOverrides?: NameAndRegistrationPair<unknown>
): Promise<awilix.AwilixContainer<MainDependencyContainer>> => {

  const container = awilix.createContainer<MainDependencyContainer>({
    injectionMode: awilix.InjectionMode.PROXY,
  });

  apiPort = apiPort
    ? apiPort
    : config.apiPort;

  container.register({
    dataDirPath: awilix.asValue(dataDirPath),
    config: awilix.asValue(config),
    apiPort: awilix.asValue(apiPort),
    gatewayConfig: awilix
      .asFunction(({ config }) => {
        return new GatewayConfig(config, gatewayPort);
      })
      .singleton(),
    ipfsConfig: awilix.asClass(IpfsConfig).singleton(),
    loggerConfig: awilix
      .asFunction(({ config }) => {
        return new LoggerConfig(config.shouldLog);
      })
      .singleton(),
    indexerConfig: awilix.asClass(IndexerConfig).singleton(),
    persistenceConfig: awilix.asClass(PersistenceConfig).singleton(),
    logger: awilix.asClass(Logger).singleton(),
    persistenceStateManager: awilix.asClass(PersistenceStateManager).singleton(),
    gatewayServer: awilix.asClass(GatewayServer).singleton(),
    apiServer: awilix.asClass(ApiServer).singleton(),
    persistenceService: awilix.asClass(PersistenceService).singleton(),
    indexRetriever: awilix.asClass(IndexRetriever).singleton(),
    ...extensionsAndOverrides,
  });

  const ipfsNode = await createIpfsNode(container.cradle);

  const persistenceStateManager = container.cradle.persistenceStateManager;
  await persistenceStateManager.load();

  container.register({
    ipfsNode: awilix
      .asFunction(() => ipfsNode)
      .singleton()
  });

  return container;
};
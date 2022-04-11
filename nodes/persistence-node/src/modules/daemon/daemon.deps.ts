import * as awilix from "awilix";
import { NameAndRegistrationPair } from "awilix";
import { createIpfsNode } from "../../createIpfsNode";
import { IpfsGatewayApi } from "../../services/IpfsGatewayApi";
import { Logger } from "../../services/Logger";
import { PersistenceNodeApi } from "../../services/PersistenceNodeApi";
import { IPFS } from "ipfs-core";
import { PersistenceNodeApiConfig } from "../../config/PersistenceNodeApiConfig";
import { IpfsConfig } from "../../config/IpfsConfig";
import { PersistenceService } from "../../services/PersistenceService";
import { PersistenceStateManager } from "../../services/PersistenceStateManager";
import { IndexerConfig } from "../../config/IndexerConfig";
import { IndexRetriever } from "../../services/IndexRetriever";
import { LoggerConfig } from "../../config/LoggerConfig";
import { Config } from "../../config/Config";

export interface MainDependencyContainer {
  dataDirPath: string;
  config: Config;
  ipfsConfig: IpfsConfig;
  loggerConfig: LoggerConfig;
  persistenceNodeApiConfig: PersistenceNodeApiConfig;
  indexerConfig: IndexerConfig;

  logger: Logger;
  ipfsNode: IPFS;

  ipfsGatewayApi: IpfsGatewayApi
  persistenceNodeApi: PersistenceNodeApi
  persistenceService: PersistenceService;
  persistenceStateManager: PersistenceStateManager;
  indexRetriever: IndexRetriever;
}

export const buildMainDependencyContainer = async (
  dataDirPath: string,
  config: Config,
  extensionsAndOverrides?: NameAndRegistrationPair<unknown>
): Promise<awilix.AwilixContainer<MainDependencyContainer>> => {

  const container = awilix.createContainer<MainDependencyContainer>({
    injectionMode: awilix.InjectionMode.PROXY,
  });

  const persistenceStateManager = new PersistenceStateManager();
  await persistenceStateManager.load();

  

  container.register({
    dataDirPath: awilix.asValue(dataDirPath),
    config: awilix.asValue(config),
    ipfsConfig: awilix.asClass(IpfsConfig).singleton(),
    loggerConfig: awilix
      .asFunction(({ config }) => {
        return new LoggerConfig(config.shouldLog);
      })
      .singleton(),
    persistenceNodeApiConfig: awilix.asClass(PersistenceNodeApiConfig).singleton(),
    indexerConfig: awilix.asClass(IndexerConfig).singleton(),
    logger: awilix.asClass(Logger).singleton(),
    persistenceStateManager: awilix
    .asFunction(({ }) => {
      return persistenceStateManager;
    })
    .singleton(),
    ipfsGatewayApi: awilix.asClass(IpfsGatewayApi).singleton(),
    persistenceNodeApi: awilix.asClass(PersistenceNodeApi).singleton(),
    persistenceService: awilix.asClass(PersistenceService).singleton(),
    indexRetriever: awilix.asClass(IndexRetriever).singleton(),
    ...extensionsAndOverrides,
  });

  const ipfsNode = await createIpfsNode(container.cradle);

  container.register({
    ipfsNode: awilix
      .asFunction(() => ipfsNode)
      .singleton()
  });

  return container;
};
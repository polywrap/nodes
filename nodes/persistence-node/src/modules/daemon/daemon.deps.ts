import * as awilix from "awilix";
import { NameAndRegistrationPair } from "awilix";
import { createIpfsNode } from "../../createIpfsNode";
import { IpfsGatewayApi } from "../../services/IpfsGatewayApi";
import { Logger } from "../../services/Logger";
import { PersistenceNodeApi } from "../../services/PersistenceNodeApi";
import { IPFS } from "ipfs-core";
import { PersistenceNodeApiConfig } from "../../config/PersistenceNodeApiConfig";
import { LoggerConfig } from "../../config/LoggerConfig";
import { IpfsConfig } from "../../config/IpfsConfig";
import { PersistenceService } from "../../services/PersistenceService";
import { PersistenceStateManager } from "../../services/PersistenceStateManager";
import { IndexerConfig } from "../../config/IndexerConfig";
import { IndexRetriever } from "../../services/IndexRetriever";

export interface MainDependencyContainer {
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
  extensionsAndOverrides?: NameAndRegistrationPair<unknown>
): Promise<awilix.AwilixContainer<MainDependencyContainer>> => {

  const container = awilix.createContainer<MainDependencyContainer>({
    injectionMode: awilix.InjectionMode.PROXY,
  });

  const persistenceStateManager = new PersistenceStateManager();
  await persistenceStateManager.load();

  

  container.register({
    ipfsConfig: awilix.asClass(IpfsConfig).singleton(),
    loggerConfig: awilix.asClass(LoggerConfig).singleton(),
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
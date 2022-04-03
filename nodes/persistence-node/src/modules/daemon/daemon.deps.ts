import * as awilix from "awilix";
import { NameAndRegistrationPair } from "awilix";
import { createIpfsNode } from "../../createIpfsNode";
import { IpfsGatewayApi } from "../../services/IpfsGatewayApi";
import { Logger } from "../../services/Logger";
import { PersistenceNodeApi } from "../../services/PersistenceNodeApi";
import { IPFS } from "ipfs-core";
import { PersistenceNodeApiConfig } from "../../config/PersistenceNodeApiConfig";
import { EnsConfig } from "../../config/EnsConfig";
import { LoggerConfig } from "../../config/LoggerConfig";
import { IpfsConfig } from "../../config/IpfsConfig";
import { EnsIndexerConfig } from "../../config/EnsIndexerConfig";
import { PersistenceService } from "../../services/PersistenceService";
import { PersistenceStateManager } from "../../services/PersistenceStateManager";
import { Contract } from "ethers";
import { EnsIndexerApp } from "../../services/EnsIndexerApp";

export interface MainDependencyContainer {
  ipfsConfig: IpfsConfig;
  ensConfig: EnsConfig;
  loggerConfig: LoggerConfig;
  persistenceNodeApiConfig: PersistenceNodeApiConfig;

  ensIndexerConfig: EnsIndexerConfig;
  logger: Logger;
  ensIndexerApp: EnsIndexerApp;
  ensPublicResolver: Contract;
  ipfsNode: IPFS;

  ipfsGatewayApi: IpfsGatewayApi
  persistenceNodeApi: PersistenceNodeApi
  persistenceService: PersistenceService;
  persistenceStateManager: PersistenceStateManager;
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
    ensConfig: awilix.asClass(EnsConfig).singleton(),
    loggerConfig: awilix.asClass(LoggerConfig).singleton(),
    persistenceNodeApiConfig: awilix.asClass(PersistenceNodeApiConfig).singleton(),
    ensIndexerConfig: awilix.asClass(EnsIndexerConfig).singleton(),
    logger: awilix.asClass(Logger).singleton(),
    ensIndexerApp: awilix.asClass(EnsIndexerApp).singleton(),
    persistenceStateManager: awilix
    .asFunction(({ }) => {
      return persistenceStateManager;
    })
    .singleton(),
    ipfsGatewayApi: awilix.asClass(IpfsGatewayApi).singleton(),
    persistenceNodeApi: awilix.asClass(PersistenceNodeApi).singleton(),
    persistenceService: awilix.asClass(PersistenceService).singleton(),
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
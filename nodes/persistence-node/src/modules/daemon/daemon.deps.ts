import * as awilix from "awilix";
import { NameAndRegistrationPair } from "awilix";
import { Storage } from "../../types/Storage";
import { EnsIndexer } from "../../services/EnsIndexer";
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
import { EnsStateManager } from "../../services/EnsStateManager";
import { PersistenceService } from "../../services/PersistenceService";
import { PersistenceStateManager } from "../../services/PersistenceStateManager";
import { EnsResolver } from "../../services/EnsResolver";

export interface MainDependencyContainer {
  ipfsConfig: IpfsConfig;
  ethersConfig: EthersConfig;
  ensConfig: EnsConfig;
  loggerConfig: LoggerConfig;
  persistenceNodeApiConfig: PersistenceNodeApiConfig;

  ensIndexerConfig: EnsIndexerConfig;
  logger: Logger;
  ensIndexer: EnsIndexer;
  ipfsGatewayApi: IpfsGatewayApi;
  persistenceNodeApi: PersistenceNodeApi;
  storage: Storage;
  ensPublicResolvers: EnsResolver[],
  ethersProvider: providers.BaseProvider;
  ensPublicResolver: Contract;
  ipfsNode: IPFS;

  ipfsGatewayApi: IpfsGatewayApi
  persistenceNodeApi: PersistenceNodeApi
  ensStateManager: EnsStateManager;
  persistenceService: PersistenceService;
  persistenceStateManager: PersistenceStateManager;
}

export const buildMainDependencyContainer = async (
  extensionsAndOverrides?: NameAndRegistrationPair<unknown>
): Promise<awilix.AwilixContainer<MainDependencyContainer>> => {

  const storage = new Storage();
  await storage.load();

  const container = awilix.createContainer<MainDependencyContainer>({
    injectionMode: awilix.InjectionMode.PROXY,
  });

  const ensStateManager = new EnsStateManager();
  await ensStateManager.load();

  const persistenceStateManager = new PersistenceStateManager();
  await persistenceStateManager.load();

  container.register({
    ipfsConfig: awilix.asClass(IpfsConfig).singleton(),
    ensConfig: awilix.asClass(EnsConfig).singleton(),
    loggerConfig: awilix.asClass(LoggerConfig).singleton(),
    persistenceNodeApiConfig: awilix.asClass(PersistenceNodeApiConfig).singleton(),
    ensIndexerConfig: awilix.asClass(EnsIndexerConfig).singleton(),
    logger: awilix.asClass(Logger).singleton(),
    ensPublicResolvers: awilix
      .asFunction(({ ensConfig }: {ensConfig: EnsConfig}) => {
        return ensConfig.networks.map(networkConfig => 
          new EnsResolver(networkConfig)
    ensStateManager: awilix
    .asFunction(({ }) => {
      return ensStateManager;
    })
    .singleton(),
    persistenceStateManager: awilix
    .asFunction(({ }) => {
      return persistenceStateManager;
    })
    .singleton(),
        );
      })
      .singleton(),
    storage: awilix
      .asFunction(({ }) => {
        return storage;
      })
      .singleton(),
    ensIndexer: awilix.asClass(EnsIndexer).singleton(),
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
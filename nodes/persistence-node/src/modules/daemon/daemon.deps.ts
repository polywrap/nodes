import * as awilix from "awilix";
import { NameAndRegistrationPair } from "awilix";
import { Storage } from "../../types/Storage";
import { CacheRunner } from "../../services/CacheRunner";
import { createIpfsNode } from "../../createIpfsNode";
import { IpfsGatewayApi } from "../../services/IpfsGatewayApi";
import { Logger } from "../../services/Logger";
import { PersistenceNodeApi } from "../../services/PersistenceNodeApi";
import { IPFS } from "ipfs-core";
import { PersistenceNodeApiConfig } from "../../config/PersistenceNodeApiConfig";
import { EnsConfig } from "../../config/EnsConfig";
import { LoggerConfig } from "../../config/LoggerConfig";
import { IpfsConfig } from "../../config/IpfsConfig";
import { EnsResolver } from "../../services/EnsResolver";

export interface MainDependencyContainer {
  ipfsConfig: IpfsConfig
  ensConfig: EnsConfig
  loggerConfig: LoggerConfig
  persistenceNodeApiConfig: PersistenceNodeApiConfig

  logger: Logger
  cacheRunner: CacheRunner
  storage: Storage
  ensPublicResolvers: EnsResolver[],
  ipfsNode: IPFS

  ipfsGatewayApi: IpfsGatewayApi
  persistenceNodeApi: PersistenceNodeApi
}

export const buildMainDependencyContainer = async (
  extensionsAndOverrides?: NameAndRegistrationPair<unknown>
): Promise<awilix.AwilixContainer<MainDependencyContainer>> => {

  const storage = new Storage();
  await storage.load();

  const container = awilix.createContainer<MainDependencyContainer>({
    injectionMode: awilix.InjectionMode.PROXY,
  });

  container.register({
    ipfsConfig: awilix.asClass(IpfsConfig).singleton(),
    ensConfig: awilix.asClass(EnsConfig).singleton(),
    loggerConfig: awilix.asClass(LoggerConfig).singleton(),
    persistenceNodeApiConfig: awilix.asClass(PersistenceNodeApiConfig).singleton(),
    logger: awilix.asClass(Logger).singleton(),
    ensPublicResolvers: awilix
      .asFunction(({ ensConfig }: {ensConfig: EnsConfig}) => {
        return ensConfig.networks.map(networkConfig => 
          new EnsResolver(networkConfig)
        );
      })
      .singleton(),
    storage: awilix
      .asFunction(({ }) => {
        return storage;
      })
      .singleton(),
    cacheRunner: awilix.asClass(CacheRunner).singleton(),
    ipfsGatewayApi: awilix.asClass(IpfsGatewayApi).singleton(),
    persistenceNodeApi: awilix.asClass(PersistenceNodeApi).singleton(),
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
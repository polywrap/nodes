import * as awilix from "awilix";
import { Contract, ethers, providers } from "ethers";
import { NameAndRegistrationPair } from "awilix";
import { Storage } from "../../types/Storage";
import { CacheRunner } from "../../services/CacheRunner";
import { createIpfsNode } from "../../createIpfsNode";
import { IpfsGatewayApi } from "../../services/IpfsGatewayApi";
import { Logger } from "../../services/Logger";
import { PersistenceNodeApi } from "../../services/PersistenceNodeApi";
import { IPFS } from "ipfs-core";
import { PersistenceNodeConfig } from "../../config/PersistenceNodeConfig";
import { EnsIndexerConfig } from "../../config/EnsIndexerConfig";

export interface MainDependencyContainer {
  persistenceNodeConfig: PersistenceNodeConfig
  ensIndexerConfig: EnsIndexerConfig
  logger: Logger
  cacheRunner: CacheRunner
  ipfsGatewayApi: IpfsGatewayApi
  persistenceNodeApi: PersistenceNodeApi
  storage: Storage
  ethersProvider: providers.BaseProvider,
  ensPublicResolver: Contract,
  ipfsNode: IPFS
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
    persistenceNodeConfig: awilix.asClass(PersistenceNodeConfig).singleton(),
    ensIndexerConfig: awilix.asClass(EnsIndexerConfig).singleton(),
    logger: awilix.asClass(Logger).singleton(),
    ethersProvider: awilix
      .asFunction(({ ensIndexerConfig }) => {
        return ethers.providers.getDefaultProvider(
          ensIndexerConfig.providerNetwork
        );
      })
      .singleton(),
    ensPublicResolver: awilix
      .asFunction(({ ensIndexerConfig, ethersProvider }) => {
        const contract = new ethers.Contract(ensIndexerConfig.ResolverAddr, ensIndexerConfig.ResolverAbi, ethersProvider);

        return contract;
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
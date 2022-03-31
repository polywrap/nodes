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
import { PersistenceNodeApiConfig } from "../../config/PersistenceNodeApiConfig";
import { EnsConfig } from "../../config/EnsConfig";
import { LoggerConfig } from "../../config/LoggerConfig";
import { IpfsConfig } from "../../config/IpfsConfig";
import { EthersConfig } from "../../config/EthersConfig";

export interface MainDependencyContainer {
  ipfsConfig: IpfsConfig
  ethersConfig: EthersConfig
  ensConfig: EnsConfig
  loggerConfig: LoggerConfig
  persistenceNodeApiConfig: PersistenceNodeApiConfig

  logger: Logger
  cacheRunner: CacheRunner
  storage: Storage
  ethersProvider: providers.BaseProvider,
  ensPublicResolver: Contract,
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
    ethersConfig: awilix.asClass(EthersConfig).singleton(),
    ensConfig: awilix.asClass(EnsConfig).singleton(),
    loggerConfig: awilix.asClass(LoggerConfig).singleton(),
    persistenceNodeApiConfig: awilix.asClass(PersistenceNodeApiConfig).singleton(),
    logger: awilix.asClass(Logger).singleton(),
    ethersProvider: awilix
      .asFunction(({ ethersConfig }) => {
        return ethers.providers.getDefaultProvider(
          ethersConfig.providerNetwork
        );
      })
      .singleton(),
    ensPublicResolver: awilix
      .asFunction(({ ensConfig, ethersProvider }) => {
        const contract = new ethers.Contract(ensConfig.ResolverAddr, ensConfig.ResolverAbi, ethersProvider);

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
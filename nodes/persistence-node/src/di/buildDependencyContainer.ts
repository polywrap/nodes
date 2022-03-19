import * as awilix from "awilix";
import { ethers } from "ethers";
import { NameAndRegistrationPair } from "awilix";
import { EthersConfig } from "../config/EthersConfig";
import { IpfsConfig } from "../config/IpfsConfig";
import { EnsConfig } from "../config/EnsConfig";
import { Storage } from "../types/Storage";
import { CacheRunner } from "../services/CacheRunner";
import { createIpfsNode } from "../createIpfsNode";
import { IpfsGatewayApi } from "../services/IpfsGatewayApi";
import { LoggerConfig } from "../config/LoggerConfig";
import { Logger } from "../services/Logger";
import { EnsNodeProcessor } from "../services/EnsNodeProcessor";

export const buildDependencyContainer = async (
  extensionsAndOverrides?: NameAndRegistrationPair<unknown>
): Promise<awilix.AwilixContainer<any>> => {

  const storage = new Storage();
  await storage.load();

  const container = awilix.createContainer({
    injectionMode: awilix.InjectionMode.PROXY,
  });

  container.register({
    ipfsConfig: awilix.asClass(IpfsConfig).singleton(),
    ethersConfig: awilix.asClass(EthersConfig).singleton(),
    ensConfig: awilix.asClass(EnsConfig).singleton(),
    loggerConfig: awilix.asClass(LoggerConfig).singleton(),
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
    ensNodeProcessor: awilix.asClass(EnsNodeProcessor).singleton(),
    ipfsGatewayApi: awilix.asClass(IpfsGatewayApi).singleton(),
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
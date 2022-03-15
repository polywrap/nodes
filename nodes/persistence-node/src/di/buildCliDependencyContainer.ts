import * as awilix from "awilix";
import { ethers } from "ethers";
import { NameAndRegistrationPair } from "awilix";
import { EthersConfig } from "../config/EthersConfig";
import { IpfsConfig } from "../config/IpfsConfig";
import { EnsConfig } from "../config/EnsConfig";
import { Storage } from "../types/Storage";
import { CacheRunner } from "../services/CacheRunner";
import { LoggerConfig } from "../config/LoggerConfig";
import { Logger } from "../services/Logger";
import { InternalApiConfig } from "../config/InternalApiConfig";

export const buildCliDependencyContainer = async (
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
    internalApiConfig: awilix.asClass(InternalApiConfig).singleton(),
    logger: awilix.asClass(Logger).singleton(),
    cacheRunner: awilix.asClass(CacheRunner).singleton(),
    ...extensionsAndOverrides,
  });

  return container;
};
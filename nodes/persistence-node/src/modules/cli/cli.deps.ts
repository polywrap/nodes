import * as awilix from "awilix";
import { ethers } from "ethers";
import { NameAndRegistrationPair } from "awilix";
import { EthersConfig } from "../../config/EthersConfig";
import { IpfsConfig } from "../../config/IpfsConfig";
import { EnsConfig } from "../../config/EnsConfig";
import { Storage } from "../../types/Storage";
import { CacheRunner } from "../../services/CacheRunner";
import { LoggerConfig } from "../../config/LoggerConfig";
import { Logger } from "../../services/Logger";
import { PersistenceNodeApiConfig } from "../../config/PersistenceNodeApiConfig";

export interface CliDependencyContainer {
  loggerConfig: LoggerConfig
  logger: Logger
  internalApiConfig: PersistenceNodeApiConfig
}

export const buildCliDependencyContainer = async (
  extensionsAndOverrides?: NameAndRegistrationPair<unknown>
): Promise<awilix.AwilixContainer<CliDependencyContainer>> => {

  const storage = new Storage();
  await storage.load();

  const container = awilix.createContainer<CliDependencyContainer>({
    injectionMode: awilix.InjectionMode.PROXY,
  });

  container.register({
    loggerConfig: awilix.asClass(LoggerConfig).singleton(),
    internalApiConfig: awilix.asClass(PersistenceNodeApiConfig).singleton(),
    logger: awilix.asClass(Logger).singleton(),
    ...extensionsAndOverrides,
  });

  return container;
};
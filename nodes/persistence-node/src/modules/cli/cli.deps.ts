import * as awilix from "awilix";
import { NameAndRegistrationPair } from "awilix";
import { PersistenceNodeApiConfig } from "../../config/PersistenceNodeApiConfig";
import { Logger } from "../../services/Logger";
import { LoggerConfig } from "../../config/LoggerConfig";

export interface CliDependencyContainer {
  persistenceNodeApiConfig: PersistenceNodeApiConfig
  loggerConfig: LoggerConfig

  logger: Logger
}

export const buildCliDependencyContainer = async (
  extensionsAndOverrides?: NameAndRegistrationPair<unknown>
): Promise<awilix.AwilixContainer<CliDependencyContainer>> => {

  const container = awilix.createContainer<CliDependencyContainer>({
    injectionMode: awilix.InjectionMode.PROXY,
  });

  container.register({
    persistenceNodeApiConfig: awilix.asClass(PersistenceNodeApiConfig).singleton(),
    loggerConfig: awilix.asClass(LoggerConfig).singleton(),
    logger: awilix.asClass(Logger).singleton(),
    ...extensionsAndOverrides,
  });

  return container;
};
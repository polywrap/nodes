import * as awilix from "awilix";
import { NameAndRegistrationPair } from "awilix";
import { LoggerConfig } from "../../config/LoggerConfig";
import { PersistenceNodeApiConfig } from "../../config/PersistenceNodeApiConfig";
import { Logger } from "../../services/Logger";

export interface CliDependencyContainer {
  persistenceNodeApiConfig: PersistenceNodeApiConfig
  loggerConfig: LoggerConfig

  logger: Logger
}

export const buildCliDependencyContainer = async (
  shouldLog: boolean,
  extensionsAndOverrides?: NameAndRegistrationPair<unknown>
): Promise<awilix.AwilixContainer<CliDependencyContainer>> => {

  const container = awilix.createContainer<CliDependencyContainer>({
    injectionMode: awilix.InjectionMode.PROXY,
  });

  container.register({
    loggerConfig: awilix
      .asFunction(({ }) => {
        return new LoggerConfig(shouldLog);
      })
      .singleton(),
    persistenceNodeApiConfig: awilix.asClass(PersistenceNodeApiConfig).singleton(),
    logger: awilix.asClass(Logger).singleton(),
    ...extensionsAndOverrides,
  });

  return container;
};
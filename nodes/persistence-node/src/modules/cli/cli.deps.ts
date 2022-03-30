import * as awilix from "awilix";
import { NameAndRegistrationPair } from "awilix";
import { PersistenceNodeConfig } from "../../config/PersistenceNodeConfig";
import { Storage } from "../../types/Storage";
import { Logger } from "../../services/Logger";

export interface CliDependencyContainer {
  logger: Logger
  persistenceNodeConfig: PersistenceNodeConfig
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
    persistenceNodeConfig: awilix.asClass(PersistenceNodeConfig).singleton(),
    logger: awilix.asClass(Logger).singleton(),
    ...extensionsAndOverrides,
  });

  return container;
};
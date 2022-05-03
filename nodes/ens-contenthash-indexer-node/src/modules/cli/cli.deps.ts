import * as awilix from "awilix";
import { NameAndRegistrationPair } from "awilix";
import { Logger } from "../../services/Logger";
import { LoggerConfig } from "../../config/LoggerConfig";
import { Config } from "../../config/Config";

export interface CliDependencyContainer {
  dataDirPath: string;
  config: Config;
  apiPort: number;
  loggerConfig: LoggerConfig
  logger: Logger
}

export const buildCliDependencyContainer = async (
  dataDirPath: string,
  config: Config,
  apiPort?: number,
  extensionsAndOverrides?: NameAndRegistrationPair<unknown>
): Promise<awilix.AwilixContainer<CliDependencyContainer>> => {

  apiPort = apiPort 
    ? apiPort 
    : config.apiPort;

  const container = awilix.createContainer<CliDependencyContainer>({
    injectionMode: awilix.InjectionMode.PROXY,
  });

  container.register({
    dataDirPath: awilix.asValue(dataDirPath),
    config: awilix.asValue(config),
    apiPort: awilix.asValue(apiPort),
    loggerConfig: awilix
      .asFunction(({ config }) => {
        return new LoggerConfig(config.shouldLog);
      })
      .singleton(),
    logger: awilix.asClass(Logger).singleton(),
    ...extensionsAndOverrides,
  });

  return container;
};
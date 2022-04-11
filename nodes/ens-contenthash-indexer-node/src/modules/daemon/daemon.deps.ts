import * as awilix from "awilix";
import { NameAndRegistrationPair } from "awilix";
import { Logger } from "../../services/Logger";
import { IndexerService } from "../../services/IndexerService";
import { LoggerConfig } from "../../config/LoggerConfig";
import { EnsIndexerConfig } from "../../config/EnsIndexerConfig";
import { Contract } from "ethers";
import { EnsNetworkConfig } from "../../config/EnsNetworkConfig";
import { EnsStateManager } from "../../services/EnsStateManager";
import { EthereumNetwork } from "../../services/EthereumNetwork";
import { APIServer } from "../../services/APIServer";
import { Config } from "../../config/Config";

export interface MainDependencyContainer {
  dataDirPath: string;
  config: Config;
  ensNetworkConfig: EnsNetworkConfig;
  loggerConfig: LoggerConfig;
  logger: Logger;
  indexerService: IndexerService;
  ensPublicResolver: Contract;
  ensIndexerConfig: EnsIndexerConfig;
  ensStateManager: EnsStateManager;
  ethereumNetwork: EthereumNetwork;
  apiServer: APIServer;
}

export const buildMainDependencyContainer = async (
  dataDirPath: string,
  config: Config,
  extensionsAndOverrides?: NameAndRegistrationPair<unknown>
): Promise<awilix.AwilixContainer<MainDependencyContainer>> => {

  const container = awilix.createContainer<MainDependencyContainer>({
    injectionMode: awilix.InjectionMode.PROXY,
  });

  container.register({
    dataDirPath: awilix.asValue(dataDirPath),
    config: awilix.asValue(config),
    loggerConfig: awilix.asValue(new LoggerConfig(config.loggerEnabled)),
    ensNetworkConfig: awilix.asClass(EnsNetworkConfig).singleton(),
    ensIndexerConfig: awilix.asClass(EnsIndexerConfig).singleton(),
    ensStateManager: awilix.asClass(EnsStateManager).singleton(),
    ethereumNetwork: awilix.asClass(EthereumNetwork).singleton(),
    logger: awilix.asClass(Logger).singleton(),
    indexerService: awilix.asClass(IndexerService).singleton(),
    apiServer: awilix.asClass(APIServer).singleton(),
    ...extensionsAndOverrides,
  });

  const ensStateManager = container.cradle.ensStateManager;
  ensStateManager.load();

  return container;
};
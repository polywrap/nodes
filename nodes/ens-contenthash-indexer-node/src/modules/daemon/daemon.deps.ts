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
import { ApiServer } from "../../services/ApiServer";
import { Config } from "../../config/Config";

export interface MainDependencyContainer {
  dataDirPath: string;
  config: Config;
  apiPort: number;
  ensNetworkConfig: EnsNetworkConfig;
  loggerConfig: LoggerConfig;
  logger: Logger;
  indexerService: IndexerService;
  ensPublicResolver: Contract;
  ensIndexerConfig: EnsIndexerConfig;
  ensStateManager: EnsStateManager;
  ethereumNetwork: EthereumNetwork;
  apiServer: ApiServer;
}

export const buildMainDependencyContainer = async (
  dataDirPath: string,
  config: Config,
  apiPort?: number,
  extensionsAndOverrides?: NameAndRegistrationPair<unknown>
): Promise<awilix.AwilixContainer<MainDependencyContainer>> => {

  const container = awilix.createContainer<MainDependencyContainer>({
    injectionMode: awilix.InjectionMode.PROXY,
  });

  apiPort = apiPort 
  ? apiPort 
  : config.apiPort;

  container.register({
    dataDirPath: awilix.asValue(dataDirPath),
    config: awilix.asValue(config),
    apiPort: awilix.asValue(apiPort),
    loggerConfig: awilix
      .asFunction(({ config }) => {
        return new LoggerConfig(config.shouldLog);
      })
      .singleton(),
    ensNetworkConfig: awilix.asClass(EnsNetworkConfig).singleton(),
    ensIndexerConfig: awilix.asClass(EnsIndexerConfig).singleton(),
    ensStateManager: awilix.asClass(EnsStateManager).singleton(),
    ethereumNetwork: awilix.asClass(EthereumNetwork).singleton(),
    logger: awilix.asClass(Logger).singleton(),
    indexerService: awilix.asClass(IndexerService).singleton(),
    apiServer: awilix.asClass(ApiServer).singleton(),
    ...extensionsAndOverrides,
  });

  const ensStateManager = container.cradle.ensStateManager;
  ensStateManager.load();

  return container;
};
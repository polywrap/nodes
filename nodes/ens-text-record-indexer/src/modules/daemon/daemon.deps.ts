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
import { createIpfsNode } from "../../createIpfsNode";
import { IpfsConfig } from "../../config/IpfsConfig";
import { IPFS } from "ipfs-core";
import { NodeStateManager } from "../../services/NodeStateManager";
import { TextRecordProcessor } from "../../services/TextRecordProcessor";
import { Queue } from "../../types/Queue";
import { EnsTextRecord } from "../../types/EnsTextRecord";
import { Provider } from "ethers-multicall";

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
  nodeStateManager: NodeStateManager;
  ensStateManager: EnsStateManager;
  ethereumNetwork: EthereumNetwork;
  textRecordProcessor: TextRecordProcessor;
  recordsToProcess: Queue<EnsTextRecord>;
  multiCallProvider: Provider;
  apiServer: ApiServer;
  ipfsConfig: IpfsConfig;
  ipfsNode: IPFS;
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
    ipfsConfig: awilix.asClass(IpfsConfig).singleton(),
    nodeStateManager: awilix.asClass(NodeStateManager).singleton(),
    ensStateManager: awilix.asClass(EnsStateManager).singleton(),
    ethereumNetwork: awilix.asClass(EthereumNetwork).singleton(),
    logger: awilix.asClass(Logger).singleton(),
    indexerService: awilix.asClass(IndexerService).singleton(),
    apiServer: awilix.asClass(ApiServer).singleton(),
    textRecordProcessor: awilix.asClass(TextRecordProcessor).singleton(),
    recordsToProcess: awilix
      .asFunction(() => {
        return new Queue<EnsTextRecord>();
      })
      .singleton(),
    multiCallProvider: awilix
      .asFunction(({ ethereumNetwork }: { ethereumNetwork: EthereumNetwork}) => {
        return new Provider(
          ethereumNetwork.ethersProvider
        );
      })
      .singleton(),
    ...extensionsAndOverrides,
  });

  const ipfsNode = await createIpfsNode(container.cradle);

  container.register({
    ipfsNode: awilix
      .asFunction(() => ipfsNode)
      .singleton()
  });

  const nodeStateManager = container.cradle.nodeStateManager;
  nodeStateManager.load();

  const ensStateManager = container.cradle.ensStateManager;
  ensStateManager.load();

  const multiCallProvider = container.cradle.multiCallProvider;
  await multiCallProvider.init();

  return container;
};
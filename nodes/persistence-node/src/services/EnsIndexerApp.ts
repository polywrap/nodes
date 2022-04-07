import { EnsConfig } from "../config/EnsConfig";
import { EnsIndexerConfig } from "../config/EnsIndexerConfig";
import { EnsIndexingService } from "./EnsIndexingService";
import { EnsStateManager } from "./EnsStateManager";
import { EthereumNetwork } from "./EthereumNetwork";
import { Logger } from "./Logger";

interface IDependencies {
  ensIndexerConfig: EnsIndexerConfig;
  ensConfig: EnsConfig;
  logger: Logger;
}

export class EnsIndexerApp {
  deps: IDependencies;
  ensStateManagers: EnsStateManager[];
  indexingNetworks: EthereumNetwork[];

  constructor(deps: IDependencies) {
    this.deps = deps;
    this.indexingNetworks = this.deps.ensConfig.networks.map(networkConfig => new EthereumNetwork(networkConfig));
    this.ensStateManagers = this.indexingNetworks.map(network => new EnsStateManager(network));
  }

  async run(fromBlock: number) {
    const tasks: Promise<void>[] = [];

    for (let i = 0; i < this.ensStateManagers.length; i++) {
      const ensStateManager = this.ensStateManagers[i];
      const network = this.indexingNetworks[i];
      await ensStateManager.load();

      const ensIndexingService = new EnsIndexingService(this.deps.ensIndexerConfig, ensStateManager, this.deps.logger);
      const indexingTask = ensIndexingService.startIndexing(fromBlock, network);
      tasks.push(indexingTask);
    }

    await Promise.all(tasks);
  }

  getIpfsHashes(): string[] {
    return this.ensStateManagers
      .map(ensStateManager => ensStateManager.getIpfsHashes())
      .flat();
  }

  containsIpfsHash(ipfsHash: string): boolean {
    return this.ensStateManagers
      .some(ensStateManager => ensStateManager.containsIpfsHash(ipfsHash));
  }

  async resolveContenthash(networkName: string, ensDomainName: string): Promise<[
    error: string | undefined, result?: string
  ]> {
    const network = this.indexingNetworks
      .filter(n => n.getNetworkAddress() === networkName)
      [0];

    if (!network) {
      return ["No Ethereum network with that name."];
    }

    const resolver = await network.ethersProvider.getResolver(ensDomainName);
    const contentHash = await resolver?.getContentHash();

    if (!contentHash) {
      return ["No content hash for that ENS domain."];
    }

    if (!contentHash.startsWith('ipfs://')) {
      return ["Content not a valid IPFS hash."];
    }

    const contentHashWithoutProtocol = contentHash
      .split('ipfs://')
      .pop();

    return [undefined, contentHashWithoutProtocol];
  }
}
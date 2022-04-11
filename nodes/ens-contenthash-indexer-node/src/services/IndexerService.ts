import { ethers } from "ethers";
import { Logger } from "./Logger";
import { sleep } from "../sleep";
import { EnsIndexerConfig } from "../config/EnsIndexerConfig";
import { EnsStateManager } from "./EnsStateManager";
import { EthereumNetwork } from "./EthereumNetwork";

type EnsNodeChangeEvent = {
  ensNode: string;
  contenthash?: string;
};

interface IDependencies {
  ensIndexerConfig: EnsIndexerConfig,
  ensStateManager: EnsStateManager,
  ethereumNetwork: EthereumNetwork,
  logger: Logger
}

export class IndexerService {
  constructor(private readonly deps: IDependencies) {
  }

  async startIndexing(fromBlock: number) {

    if(fromBlock > this.deps.ensStateManager.lastBlockNumber) {
      this.deps.ensStateManager.lastBlockNumber = fromBlock;
      await this.deps.ensStateManager.save();
    } 
    this.deps.logger.log(`Indexing events from block ${this.deps.ensStateManager.lastBlockNumber}...`);

    while(true) {
      const nextBlockToIndex = this.deps.ensStateManager.lastBlockNumber;
      let latestBlock: number | undefined;

      try {
        latestBlock = await this.deps.ethereumNetwork.ethersProvider.getBlockNumber();
      }
      catch(ex) {
        this.deps.logger.log(`Error getting block number`);
        this.deps.logger.log(JSON.stringify(ex));
      }

      if(latestBlock) {
        if(latestBlock < nextBlockToIndex) {
          await sleep(this.deps.ensIndexerConfig.requestInterval);
          continue;
        }

        await this.indexBlockRange(nextBlockToIndex, latestBlock);

        this.deps.ensStateManager.lastBlockNumber = latestBlock + 1;
        await this.deps.ensStateManager.save(); 
      }

      await sleep(this.deps.ensIndexerConfig.requestInterval);
    }
  }

  private async indexBlockRange(fromBlock: number, toBlock: number): Promise<void> { 
    const uniqueEventList: EnsNodeChangeEvent[] = []
    const ensNodeEventMap: Map<string, EnsNodeChangeEvent> = new Map();

    let queryStart = fromBlock;
    let queryEnd;

    while(queryStart <= toBlock) {
      const prevUniqueEventListLength = uniqueEventList.length;

      if(toBlock - queryStart > this.deps.ensIndexerConfig.maxBlockRangePerRequest) {
        queryEnd = queryStart + this.deps.ensIndexerConfig.maxBlockRangePerRequest;
      } else {
        queryEnd = toBlock;
      }

      let logs: ethers.Event[];

      try {
        this.deps.logger.log(`Querying from ${queryStart} to ${queryEnd}(${queryEnd - queryStart + 1} blocks) for ${this.deps.ethereumNetwork.name}`);
        logs = await this.deps.ethereumNetwork.ensPublicResolver.queryFilter(
          this.deps.ethereumNetwork.ensPublicResolver.filters.ContenthashChanged(), 
          queryStart, 
          queryEnd
        );
        await sleep(1000);
      } catch {
        this.deps.logger.log(`Error querying logs for block range ${queryStart}-${queryEnd}`);
        await sleep(1000);
        continue;
      }

      for(const log of logs) {
        const ensNode = log.args?.node;
        const contenthash = log.args?.hash;

        if(!ensNode || !contenthash) {
          continue;
        }

        const existingEvent = ensNodeEventMap.get(ensNode);
        if(existingEvent) {
          existingEvent.contenthash = contenthash;
        } else {
          const event = {
            contenthash,
            ensNode
          };

          uniqueEventList.push(event);
          ensNodeEventMap.set(ensNode, event);
        }
      }

      const blocksLeft = toBlock - queryEnd;
      queryStart = queryEnd + 1;

      if(uniqueEventList.length > prevUniqueEventListLength) {
        this.deps.logger.log(`Found a total of ${uniqueEventList.length} events`);
      }

      this.deps.logger.log(`${blocksLeft} blocks left to index`);
    }

    for(const event of uniqueEventList) {
      await this.processEnsIpfs(event.ensNode, event.contenthash);
    }
  }

  async processEnsIpfs(ensNode: string, ipfsHash: string | undefined): Promise<void> {
    this.deps.ensStateManager.update(ensNode, ipfsHash);
  }
}
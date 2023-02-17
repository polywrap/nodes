import { ethers } from "ethers";
import { Logger } from "./Logger";
import { sleep } from "../sleep";
import { EnsIndexerConfig } from "../config/EnsIndexerConfig";
import { EnsStateManager } from "./EnsStateManager";
import { EthereumNetwork } from "./EthereumNetwork";
import { EnsNetworkConfig } from "../config/EnsNetworkConfig";
import { IPFS } from "ipfs-core";
import { NodeStateManager } from "./NodeStateManager";
import { ApiServer } from "./ApiServer";

type EnsNodeChangeEvent = {
  ensNode: string;
  key?: string;
};

interface IDependencies {
  ensIndexerConfig: EnsIndexerConfig;
  ensNetworkConfig: EnsNetworkConfig;
  nodeStateManager: NodeStateManager;
  ensStateManager: EnsStateManager;
  ethereumNetwork: EthereumNetwork;
  apiServer: ApiServer;
  logger: Logger;
  ipfsNode: IPFS;
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

    await this.index();
  }

  private async index() {
    this.deps.ensStateManager.state.lastBlockNumberProcessed = this.deps.ensStateManager.lastBlockNumber;
    this.deps.ensStateManager.state.isFullySynced = false;
    this.deps.ensStateManager.save();
    while(true) {
      const nextBlockToIndex = this.deps.ensStateManager.lastBlockNumber;
      let latestBlock: number | undefined;

      try {
        latestBlock = await this.deps.ethereumNetwork.ethersProvider.getBlockNumber();
      }
      catch(ex) {
        this.deps.logger.log(`Error getting block number`);
        console.log(ex);
      }

      if(latestBlock) {
        if(latestBlock < nextBlockToIndex) {
          await sleep(this.deps.ensIndexerConfig.requestInterval);
          continue;
        }

        await this.indexBlockRange(nextBlockToIndex, latestBlock);
        const indexedBlocksCnt = latestBlock - nextBlockToIndex + 1;

        if(indexedBlocksCnt < this.deps.ensIndexerConfig.maxBlockRangePerRequest) {
          this.deps.ensStateManager.state.isFullySynced = true;
        } else {
          this.deps.ensStateManager.state.isFullySynced = false;
        }

        this.deps.ensStateManager.lastBlockNumber = latestBlock + 1;
        await this.deps.ensStateManager.save(); 
      }

      await sleep(this.deps.ensIndexerConfig.requestInterval);
    }
  }

  private async indexBlockRange(fromBlock: number, toBlock: number): Promise<void> { 
    let uniqueEventCnt = 0;
    const ensNodeEventMap: Record<string, Set<string>> = {};

    let queryStart = fromBlock;
    let queryEnd;

    while(queryStart <= toBlock) {
      const prevUniqueEventCnt = uniqueEventCnt;

      if(toBlock - queryStart > this.deps.ensIndexerConfig.maxBlockRangePerRequest) {
        queryEnd = queryStart + this.deps.ensIndexerConfig.maxBlockRangePerRequest;
      } else {
        queryEnd = toBlock;
      }

      let logs: ethers.Event[];

      try {
        this.deps.logger.log(`Querying from ${queryStart} to ${queryEnd}(${queryEnd - queryStart + 1} blocks) for ${this.deps.ethereumNetwork.name}`);
        logs = await this.deps.ethereumNetwork.ensPublicResolver.queryFilter(
          this.deps.ethereumNetwork.ensPublicResolver.filters.TextChanged(), 
          queryStart, 
          queryEnd
        );
        this.deps.ensStateManager.state.lastBlockNumberProcessed = queryEnd;
        await sleep(1000);
      } catch(ex) {
        this.deps.logger.log(`Error querying logs for block range ${queryStart}-${queryEnd}`);
        console.error(ex);
        await sleep(1000);
        continue;
      }

      for(const log of logs) {
        const ensNode = log.args?.node;
        const key = log.args?.key;

        if(!ensNode || !key) {
          continue;
        }

        const keys = ensNodeEventMap[ensNode];
        if(keys) {
          const lastLength = keys.size;
          keys.add(key);

          if(keys.size > lastLength) {
            uniqueEventCnt++;
          }
        } else {
          ensNodeEventMap[ensNode] = new Set([key]);
          uniqueEventCnt++;
        }
      }

      const blocksLeft = toBlock - queryEnd;
      queryStart = queryEnd + 1;

      if(uniqueEventCnt > prevUniqueEventCnt) {
        this.deps.logger.log(`Found a total of ${uniqueEventCnt} unique events`);
      }

      this.deps.logger.log(`${blocksLeft} blocks left to index`);
    }

    for(const ensNode of Object.keys(ensNodeEventMap)) {
      const keys = ensNodeEventMap[ensNode];
      for(const key of keys) {
        await this.processEvent(ensNode, key);
      }
    }
  }

  private async processEvent(ensNode: string, key: string | undefined): Promise<void> {
    this.deps.ensStateManager.update(ensNode, key);
  }
}
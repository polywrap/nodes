import { ethers } from "ethers";
import { getIpfsHashFromContenthash } from "../getIpfsHashFromContenthash";
import * as IPFS from 'ipfs-core';
import { IpfsConfig } from "../config/IpfsConfig";
import { Logger } from "./Logger";
import { sleep } from "../sleep";
import { EnsIndexerConfig } from "../config/EnsIndexerConfig";
import { EnsStateManager } from "./EnsStateManager";
import { EthereumNetwork } from "./EthereumNetwork";

type EnsNodeChangeEvent = {
  ensNode: string;
  cid?: string;
};

interface IDependencies {

}

export class EnsIndexingService {

  constructor(
    private readonly ensIndexerConfig: EnsIndexerConfig,
    private readonly ensStateManager: EnsStateManager,
    private readonly logger: Logger
  ) {
  }

  async startIndexing(fromBlock: number, network: EthereumNetwork) {

    if(fromBlock > this.ensStateManager.lastBlockNumber) {
      this.ensStateManager.lastBlockNumber = fromBlock;
      await this.ensStateManager.save();
    } 
    this.logger.log(`Indexing events from block ${this.ensStateManager.lastBlockNumber}...`);

    while(true) {
      const nextBlockToIndex = this.ensStateManager.lastBlockNumber;
      
      let latestBlock = await network.ethersProvider.getBlockNumber();

      if(latestBlock < nextBlockToIndex) {
        await sleep(this.ensIndexerConfig.requestInterval);
        continue;
      }

      await this.indexBlockRange(nextBlockToIndex, latestBlock, network);

      this.ensStateManager.lastBlockNumber = latestBlock + 1;
      await this.ensStateManager.save(); 
      
      await sleep(this.ensIndexerConfig.requestInterval);
    }
  }

  private async indexBlockRange(fromBlock: number, toBlock: number, network: EthereumNetwork): Promise<void> { 
    const uniqueEventList: EnsNodeChangeEvent[] = []
    const ensNodeEventMap: Map<string, EnsNodeChangeEvent> = new Map();

    let queryStart = fromBlock;
    let queryEnd;

    while(queryStart <= toBlock) {
      const prevUniqueEventListLength = uniqueEventList.length;

      if(toBlock - queryStart > this.ensIndexerConfig.maxBlockRangePerRequest) {
        queryEnd = queryStart + this.ensIndexerConfig.maxBlockRangePerRequest;
      } else {
        queryEnd = toBlock;
      }

      let logs: ethers.Event[];

      try {
        console.log("get", network.chainId);
        logs = await network.ensPublicResolver.queryFilter(
          network.ensPublicResolver.filters.ContenthashChanged(), 
          queryStart, 
          queryEnd
        );
      } catch {
        this.logger.log(`Error querying logs for block range ${queryStart}-${queryEnd}`);
        await sleep(1000);
        continue;
      }

      for(const log of logs) {
        const ensNode = log.args?.node;
        const contenthash = log.args?.hash;

        if(!ensNode || !contenthash) {
          continue;
        }

        const cid =  getIpfsHashFromContenthash(contenthash);

        const existingEvent = ensNodeEventMap.get(ensNode);
        if(existingEvent) {
          existingEvent.cid = cid;
        } else {
          const event = {
            cid,
            ensNode
          };

          uniqueEventList.push(event);
          ensNodeEventMap.set(ensNode, event);
        }
      }

      const blocksLeft = toBlock - queryEnd;
      queryStart = queryEnd + 1;

      if(uniqueEventList.length > prevUniqueEventListLength) {
        this.logger.log(`Found ${uniqueEventList.length} events, ${blocksLeft} blocks left to index`);
      }
    }

    for(const event of uniqueEventList) {
      await this.processEnsIpfs(event.ensNode, event.cid);
    }
  }

  async processEnsIpfs(ensNode: string, ipfsHash: string | undefined): Promise<void> {
    this.ensStateManager.update(ensNode, ipfsHash);
  }
}
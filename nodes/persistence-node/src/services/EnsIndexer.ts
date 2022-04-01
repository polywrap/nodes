import { ethers } from "ethers";
import { getIpfsHashFromContenthash } from "../getIpfsHashFromContenthash";
import * as IPFS from 'ipfs-core';
import { IpfsConfig } from "../config/IpfsConfig";
import { Logger } from "./Logger";
import { sleep } from "../sleep";
import { EnsIndexerConfig } from "../config/EnsIndexerConfig";
import { EnsStateManager } from "./EnsStateManager";

type EnsNodeChangeEvent = {
  ensNode: string;
  cid?: string;
};

interface IDependencies {
  ethersProvider: ethers.providers.Provider;
  ensPublicResolver: ethers.Contract;
  ipfsNode: IPFS.IPFS;
  ipfsConfig: IpfsConfig;
  ensIndexerConfig: EnsIndexerConfig;
  ensStateManager: EnsStateManager;
  logger: Logger;
}

export class EnsIndexer {
  deps: IDependencies;

  constructor(deps: IDependencies) {
    this.deps = deps;
  }

  async startIndexing(fromBlock: number) {

    if(fromBlock > this.deps.ensStateManager.lastBlockNumber) {
      this.deps.ensStateManager.lastBlockNumber = fromBlock;
      await this.deps.ensStateManager.save();
    } 
    this.deps.logger.log(`Indexing events from block ${this.deps.ensStateManager.lastBlockNumber}...`);

    while(true) {
      const nextBlockToIndex = this.deps.ensStateManager.lastBlockNumber;
      
      let latestBlock = await this.deps.ethersProvider.getBlockNumber();

      if(latestBlock < nextBlockToIndex) {
        await sleep(this.deps.ensIndexerConfig.requestInterval);
        continue;
      }

      await this.indexBlockRange(nextBlockToIndex, latestBlock);

      this.deps.ensStateManager.lastBlockNumber = latestBlock + 1;
      await this.deps.ensStateManager.save(); 
      
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
        logs = await this.deps.ensPublicResolver.queryFilter(
          this.deps.ensPublicResolver.filters.ContenthashChanged(), 
          queryStart, 
          queryEnd
        );
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

      queryStart = queryEnd + 1;

      if(uniqueEventList.length > prevUniqueEventListLength) {
        this.deps.logger.log(`Found ${uniqueEventList.length} events`);
      }
    }

    for(const event of uniqueEventList) {
      await this.processEnsIpfs(event.ensNode, event.cid);
    }
  }

  async processEnsIpfs(ensNode: string, ipfsHash: string | undefined): Promise<void> {
    this.deps.ensStateManager.update(ensNode, ipfsHash);
  }
}
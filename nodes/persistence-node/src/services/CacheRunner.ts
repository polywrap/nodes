import { ethers } from "ethers";
import { getIpfsHashFromContenthash } from "../getIpfsHashFromContenthash";
import { Storage } from "../types/Storage";
import { isWrapper } from "../isWrapper";
import * as IPFS from 'ipfs-core';
import { pinCid } from "../pinCid";
import { unpinCid } from "../unpinCid";
import { toShortString } from "../toShortString";
import { IpfsConfig } from "../config/IpfsConfig";
import { Logger } from "./Logger";
import { sleep } from "../sleep";
import { EnsIndexerConfig } from "../config/EnsIndexerConfig";

type EnsNodeChangeEvent = {
  ensNode: string;
  cid?: string;
};

interface IDependencies {
  ethersProvider: ethers.providers.Provider;
  ensPublicResolver: ethers.Contract;
  storage: Storage;
  ipfsNode: IPFS.IPFS;
  ipfsConfig: IpfsConfig;
  ensIndexerConfig: EnsIndexerConfig;
  logger: Logger;
}

export class CacheRunner {
  deps: IDependencies;

  constructor(deps: IDependencies) {
    this.deps = deps;
  }

  async startIndexing(fromBlock: number) {

    if(fromBlock > this.deps.storage.lastBlockNumber) {
      this.deps.storage.lastBlockNumber = fromBlock;
      await this.deps.storage.save();
    } 
    this.deps.logger.log(`Indexing events from block ${this.deps.storage.lastBlockNumber}...`);

    while(true) {
      const nextBlockToIndex = this.deps.storage.lastBlockNumber;
      
      let latestBlock = await this.deps.ethersProvider.getBlockNumber();

      if(latestBlock < nextBlockToIndex) {
        await sleep(this.deps.ensIndexerConfig.requestInterval);
        continue;
      }

      await this.indexBlockRange(nextBlockToIndex, latestBlock);

      this.deps.storage.lastBlockNumber = latestBlock + 1;
      await this.deps.storage.save(); 
      
      await sleep(this.deps.ensIndexerConfig.requestInterval);
    }
  }

  private async indexBlockRange(fromBlock: number, toBlock: number): Promise<void> { 
    const uniqueEventList: EnsNodeChangeEvent[] = []
    const ensNodeEventMap: Map<string, EnsNodeChangeEvent> = new Map();

    let queryStart = fromBlock;
    let queryEnd;

    while(queryStart <= toBlock) {
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
    }

    for(const event of uniqueEventList) {
      this.deps.logger.log("----------------------------------------------");
      await this.processEnsIpfs(event.ensNode, event.cid);
      this.deps.logger.log("----------------------------------------------"); 
    }
  } 

  async processUnresponsive() {
    this.deps.logger.log("Processing unresponsive packages...");
    
    const ensNodes = Object.keys(this.deps.storage.unresponsiveEnsNodes);
    this.deps.storage.unresponsiveEnsNodes = {};

    await this.processEnsNodes(ensNodes);
  }

  async processEnsIpfs(ensNode: string, ipfsHash: string | undefined): Promise<boolean> {
    const ensIpfsCache = this.deps.storage.ensIpfs;
    const ipfsEnsCache = this.deps.storage.ipfsEns;

    if(!ipfsHash) {
      const savedIpfsHash = ensIpfsCache[ensNode];

      if(savedIpfsHash) {
        this.deps.logger.log("ENS no longer points to an IPFS hash");
        this.deps.logger.log("Unpinning...");

        const success = await unpinCid(this.deps.ipfsNode, this.deps.ipfsConfig, savedIpfsHash);
        
        if(success) {

          if(ipfsEnsCache[savedIpfsHash]) {
            delete ipfsEnsCache[savedIpfsHash];
          }

          delete ensIpfsCache[ensNode];

          this.deps.logger.log("Unpinned successfully");
        } else {
          this.deps.logger.log("Unpinning failed");
        }
      } else {
        this.deps.logger.log("Nothing changed");
      }

      return false;
    }

    if(Object.keys(this.deps.storage.unresponsiveEnsNodes).includes(ensNode)) {
      this.deps.logger.log(`Ens domain already included in unresponsive list (${Object.keys(this.deps.storage.unresponsiveEnsNodes).length})`);
      return false;
    }

    if(!ipfsEnsCache[ipfsHash]) {
      this.deps.logger.log(`Checking if ${ipfsHash} is a wrapper`);

      const resp = await isWrapper(this.deps.ipfsNode, this.deps.ipfsConfig, this.deps.logger, ipfsHash);

      if(resp === "no") {
        this.deps.logger.log("IPFS hash is not a valid wrapper");
        return false;
      } else if(resp === "timeout") {
        this.deps.storage.unresponsiveEnsNodes[ensNode] = true;
        this.deps.logger.log(`Added ${toShortString(ensNode)} to unresponsive list (${Object.keys(this.deps.storage.unresponsiveEnsNodes).length})`);
        return false;
      }

      const success = await pinCid(this.deps.ipfsNode, this.deps.ipfsConfig, ipfsHash);  

      if(!success) {
        this.deps.logger.log("Pinning failed");
        this.deps.storage.unresponsiveEnsNodes[ensNode] = true;
        this.deps.logger.log(`Added ${toShortString(ensNode)} to unresponsive list (${Object.keys(this.deps.storage.unresponsiveEnsNodes).length})`);
        return false;
      }

      ipfsEnsCache[ipfsHash] = ensNode;
      ensIpfsCache[ensNode] = ipfsHash;

      return true;
    } else {
      this.deps.logger.log(`${ipfsHash} is already pinned`);
      return false;
    }
  }

  async processEnsNodes(nodes: string[]) {
    const ensNodes = [...new Set(nodes)];

    this.deps.logger.log(`Found ${ensNodes.length} eligible ENS domains`);

    if(!ensNodes.length) {
      return;
    }

    this.deps.logger.log(`Pinning...`);
    let pinnedCnt = 0;

    for(let i = 0; i < ensNodes.length; i++) {
      const ensNode = ensNodes[i];

      this.deps.logger.log("----------------------------------------------");
      this.deps.logger.log(`Retrieving contenthash for ${toShortString(ensNode)} (${i+1}/${ensNodes.length})`);
      
      try {
        const contenthash = await this.deps.ensPublicResolver.contenthash(ensNode);
        const ipfsHash = getIpfsHashFromContenthash(contenthash);
  
        this.deps.logger.log("Retrieved IPFS hash for ENS domain");
        const newlyPinned = await this.processEnsIpfs(ensNode, ipfsHash);

        if(newlyPinned) {
          pinnedCnt++;
        }
      } catch(ex) {
        this.deps.logger.log(`Added ${toShortString(ensNode)} to unresponsive list (${Object.keys(this.deps.storage.unresponsiveEnsNodes).length})`);
        this.deps.logger.log("Error retrieving contenthash");
        this.deps.logger.log(JSON.stringify(ex));
      }
      await this.deps.storage.save();
      this.deps.logger.log(`${pinnedCnt} newly pinned nodes`);
      this.deps.logger.log("----------------------------------------------");
    }

    this.deps.logger.log(`Finished processing ${ensNodes.length} ENS domains`);
    this.deps.logger.log(`${Object.keys(this.deps.storage.ipfsEns).length} pinned IPFS hashes`);

    this.deps.logger.log(`${Object.keys(this.deps.storage.unresponsiveEnsNodes).length} unresponsive domains/ipfs hashes`);
  }
}
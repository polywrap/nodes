import { ethers } from "ethers";
import { Logger } from "./Logger";
import { sleep } from "../sleep";
import { EnsIndexerConfig } from "../config/EnsIndexerConfig";
import { EnsStateManager } from "./EnsStateManager";
import { EthereumNetwork } from "./EthereumNetwork";
import { EnsNetworkConfig } from "../config/EnsNetworkConfig";
import { IPFS } from "ipfs-core";
import { getIpfsFileContents } from "../getIpfsFileContents";
import { NodeStateManager } from "./NodeStateManager";
import { ApiServer } from "./ApiServer";
import { EnsState } from "../types/EnsState";

type EnsNodeChangeEvent = {
  ensNode: string;
  contenthash?: string;
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

    await this.tryFastSync();
    await this.index();
  }

  private async tryFastSync() {
    const fastSyncProvider = ethers.providers.getDefaultProvider(
      this.deps.ensNetworkConfig.fastSync.network,
    );
    const resolver = await fastSyncProvider.getResolver(this.deps.ensNetworkConfig.fastSync.domain);

    let contenthash: string | undefined = "";

    try {
      contenthash = await resolver?.getContentHash();
    } catch(ex: any) {
      if(!ex.message.startsWith("invalid or unsupported content hash data")) {
        throw ex;
      }
    }

    if(!contenthash) {
      this.deps.logger.log(`No contenthash found for ${this.deps.ensNetworkConfig.fastSync.domain}`);
      return;
    }

    const [error, ipfsHash] = this.getIpfsHashFromContenthash(contenthash);

    if(error || !ipfsHash) {
      this.deps.logger.log(`No ipfs hash found for contenthash: ${contenthash}`);
      return;
    }

    this.deps.logger.log(`Fast syncing with ${ipfsHash} from ${this.deps.ensNetworkConfig.fastSync.domain} (${this.deps.ensNetworkConfig.fastSync.network})`);
    
    const ensStateJson = await getIpfsFileContents(this.deps.ipfsNode, ipfsHash);
    if(!ensStateJson) {
      this.deps.logger.log(`State is empty, skipping fast sync`);
      return;
    }

    const lastIpfsHashForFastSync = this.deps.nodeStateManager.lastIpfsHashForFastSync();
    if(lastIpfsHashForFastSync !== ipfsHash) {
      if(lastIpfsHashForFastSync) {
        this.deps.logger.log(`Unpinning old fast sync state: ${lastIpfsHashForFastSync}`);
        await this.deps.ipfsNode.pin.rm(lastIpfsHashForFastSync).catch(err => {
          if(!err.message.startsWith("not pinned")) {
            throw err;
          }
        });
      }

      this.deps.logger.log(`Pinning fast sync state at ${ipfsHash}`);
      await this.deps.ipfsNode.pin.add(ipfsHash);
      this.deps.nodeStateManager.updateLastIpfsHashForFastSync(ipfsHash);
    }

    const ensState: EnsState = JSON.parse(ensStateJson.toString());

    if(ensState.lastBlockNumber < this.deps.ensStateManager.lastBlockNumber) {
      this.deps.logger.log(`Fast sync state is older than current state, skipping fast sync`);
      return;
    }

    ensState.lastSyncedAt = new Date();

    this.deps.ensStateManager.updateState(ensState);
    this.deps.ensStateManager.lastBlockNumber = ensState.lastBlockNumber;

    this.deps.logger.log(`Fast sync successful`);
  }

  private getIpfsHashFromContenthash(contenthash: string): [error: string | undefined, result: string | undefined] {
    if (!contenthash) {
      return ["No content hash for that ENS domain.", undefined];
    }

    if (!contenthash.startsWith('ipfs://')) {
      return ["Content not a valid IPFS hash.", undefined];
    }

    const contentHashWithoutProtocol = contenthash
      .split('ipfs://')
      .pop();

    return [undefined, contentHashWithoutProtocol];
  }

  private async index() {
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
          //If we have synced to the latest block then we start the API server if it's not already running
          await this.deps.apiServer.tryStart();
          this.deps.ensStateManager.updateState({
            ...this.deps.ensStateManager.getState(),
            isFullySynced: true
          });
        } else {
          //If we are still syncing we stop the server if it's running
          //This prevents consumers of the API to get out of date information
          await this.deps.apiServer.tryStop();
        }

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

  private async processEnsIpfs(ensNode: string, ipfsHash: string | undefined): Promise<void> {
    this.deps.ensStateManager.update(ensNode, ipfsHash);
  }
}
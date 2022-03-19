import { ethers } from "ethers";
import { getIpfsHashFromContenthash } from "../getIpfsHashFromContenthash";
import { sleep } from "../sleep";
import { toShortString } from "../toShortString";
import { ProcessEnsIpfsResult } from "../types/ProcessEnsIpfsResult";
import { Storage } from "../types/Storage";
import { CacheRunner } from "./CacheRunner";
import { Logger } from "./Logger";

interface IDependencies {
  storage: Storage,
  logger: Logger,
  ensPublicResolver: ethers.Contract;
  cacheRunner: CacheRunner;
}

interface IEventQueueItem {
  ensNode: string,
  ipfsHash: string | undefined,
  blockNumber: number
}

export class EnsNodeProcessor {
  deps: IDependencies;
  eventsQueue: IEventQueueItem[];

  constructor(deps: IDependencies) {
    this.deps = deps;
    this.eventsQueue = [];
  }

  enqueue(event: IEventQueueItem) {
    this.eventsQueue.push(event);
  }

  async run(processUnresponsive: boolean) {
    this.deps.logger.log("Processing ens nodes...");

    while (true) {
      await this.processEnqueuedEvents();
      if (processUnresponsive) {
        await this.processUnresponsiveNode();
      }
      await sleep(500);
    }
  }

  async processEnqueuedEvents() {
    while (this.eventsQueue.length) {
      const event = this.eventsQueue.shift()!;
      this.deps.storage.unresponsiveEnsNodes.delete(event.ensNode);
      this.deps.logger.log("----------------------------------------------");
      await this.deps.cacheRunner.processEnsIpfs(event.ensNode, event.ipfsHash);
      this.deps.storage.lastBlockNumber = event.blockNumber - 1;
      await this.deps.storage.save();
      this.deps.logger.log("----------------------------------------------");
    }
  }

  async processUnresponsiveNode() {
    if (this.deps.storage.unresponsiveEnsNodes.size) {
      const [ensNode] = this.deps.storage.unresponsiveEnsNodes.keys();
      this.deps.storage.unresponsiveEnsNodes.delete(ensNode);
      try {
        this.deps.logger.log("----------------------------------------------");
        this.deps.logger.log(`Retrieving contenthash for unresponsive ${toShortString(ensNode)}`);
        const contenthash = await this.deps.ensPublicResolver.contenthash(ensNode);
        const ipfsHash = getIpfsHashFromContenthash(contenthash);
        this.deps.logger.log("Retrieved IPFS hash for ENS domain");
        const status = await this.deps.cacheRunner.processEnsIpfs(ensNode, ipfsHash);
                
        if (status !== ProcessEnsIpfsResult.Error) {
          this.deps.logger.log(`Sucessfully processed unresponsive ${toShortString(ensNode)}`);
        } else {
          this.deps.logger.log(`Retry for unresponsive ${toShortString(ensNode)} failed`);
        }
      }
      catch (ex) {
        this.deps.logger.log(JSON.stringify(ex));
        this.deps.logger.log(`Retry for unresponsive ${toShortString(ensNode)} failed`);
        this.deps.storage.unresponsiveEnsNodes.set(ensNode, true);
      }
      this.deps.storage.save();
    }
  }
}
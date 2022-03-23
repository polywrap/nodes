import { ethers } from "ethers";
import { getIpfsHashFromContenthash } from "../getIpfsHashFromContenthash";
import { sleep } from "../sleep";
import { toShortString } from "../toShortString";
import { Storage } from "../types/Storage";
import { CacheRunner } from "./CacheRunner";
import { Logger } from "./Logger";

interface IDependencies {
  storage: Storage;
  logger: Logger;
  ensPublicResolver: ethers.Contract;
  cacheRunner: CacheRunner;
}

interface IEventData {
  ensNode: string;
  ipfsHash: string | undefined;
  blockNumber: number;
}

export class EnsNodeProcessor {
  deps: IDependencies;
  scheduledEvents: Map<string, IEventData>;

  constructor(deps: IDependencies) {
    this.deps = deps;
    this.scheduledEvents = new Map();
  }

  schedule(event: IEventData) {
    this.scheduledEvents.set(event.ensNode, event);
  }

  async run(processUnresponsive: boolean) {
    this.deps.logger.log("Processing ens nodes...");

    while (true) {
      await this.processScheduledEvents();
      if (processUnresponsive && this.deps.storage.unresponsiveEnsNodes.size) {
        await this.processUnresponsiveNode();
      } else {
        await sleep(500);
      }
      
    }
  }

  async processScheduledEvents() {
    while (this.scheduledEvents.size) {
      const events = Array.from(this.scheduledEvents.values());
      this.scheduledEvents.clear();
      const scheduledHashes = events.map(e => e.ipfsHash);

      await Promise.all(events.map(async event => {
        try {
          this.deps.storage.unresponsiveEnsNodes.delete(event.ensNode);
          this.deps.logger.log("----------------------------------------------");

          await this.deps.cacheRunner.processEnsIpfs(
            event.ensNode,
            event.ipfsHash,
            (savedIpfsHash) => this.deps.storage.getEnsNodes(savedIpfsHash)?.length === 1 && 
                               !scheduledHashes.some(scheduled => scheduled === savedIpfsHash));

          this.deps.logger.log("----------------------------------------------");
        } catch (ex) {
          this.deps.logger.log(JSON.stringify(ex));
          this.deps.logger.log(`Processing of ${toShortString(event.ensNode)} failed`);
          this.deps.storage.unresponsiveEnsNodes.set(event.ensNode, true);
        } finally {
          await this.deps.storage.save();
        }
      }));

      this.deps.storage.lastBlockNumber = Math.max(...events.map(e => e.blockNumber)) - 1;
      await this.deps.storage.save();
    }
  }

  async processUnresponsiveNode() {
    const [ensNode] = this.deps.storage.unresponsiveEnsNodes.keys();
    this.deps.storage.unresponsiveEnsNodes.delete(ensNode);
    try {
      this.deps.logger.log("----------------------------------------------");
      this.deps.logger.log(`Retrieving contenthash for unresponsive ${toShortString(ensNode)}`);
      const contenthash = await this.deps.ensPublicResolver.contenthash(ensNode);
      const ipfsHash = getIpfsHashFromContenthash(contenthash);
      this.deps.logger.log("Retrieved IPFS hash for ENS domain");
      await this.deps.cacheRunner.processEnsIpfs(ensNode, ipfsHash, (savedIpfsHash) => this.deps.storage.getEnsNodes(savedIpfsHash)?.length === 1);
      this.deps.logger.log(`Sucessfully processed unresponsive ${toShortString(ensNode)}`);
    }
    catch (ex) {
      this.deps.logger.log(JSON.stringify(ex));
      this.deps.logger.log(`Retry for unresponsive ${toShortString(ensNode)} failed`);
      this.deps.storage.unresponsiveEnsNodes.set(ensNode, true);
    } finally {
      this.deps.storage.save();
    }
  }
}

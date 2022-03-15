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
  cacheRunner: CacheRunner,
  logger: Logger,
  ensPublicResolver: ethers.Contract,
}

export class UnrensponsiveEnsNodeProcessor {
  isCanceled = false;
  deps: IDependencies;
  
  constructor(deps: IDependencies) {
    this.deps = deps;
  }

  async run() {
    this.deps.logger.log("Processing unrensponsive packages...");

    while (true) {
      const unresponsiveEnsNodes = Object.keys(this.deps.storage.unresponsiveEnsNodes);
            
      if (this.isCanceled && !unresponsiveEnsNodes.length) {
        this.deps.logger.log("Processing of unrensponsive packages cancelled");
        return;
      }
            
      if (!unresponsiveEnsNodes.length) {
        await sleep(500);
        continue;
      }

      await this.processNodes(unresponsiveEnsNodes);
    }
  }

  async processNodes(ensNodes: string[]) {
    for (const ensNode of ensNodes) {
      try {
        this.deps.logger.log("----------------------------------------------");
        this.deps.logger.log(`Retrieving contenthash for unresponsive ${toShortString(ensNode)}`);
        const contenthash = await this.deps.ensPublicResolver.contenthash(ensNode);
        const ipfsHash = getIpfsHashFromContenthash(contenthash);
        this.deps.logger.log("Retrieved IPFS hash for ENS domain");
        const status = await this.deps.cacheRunner.processEnsIpfs(ensNode, ipfsHash);
                
        if (status !== ProcessEnsIpfsResult.Error) {
          delete this.deps.storage.unresponsiveEnsNodes[ensNode];
          this.deps.logger.log(`Sucessfully processed unresponsive ${toShortString(ensNode)}`);
        } else {
          this.deps.storage.unresponsiveEnsNodes[ensNode] = true;
          this.deps.logger.log(`Retry for unresponsive ${toShortString(ensNode)} failed`);
        }
      } catch(ex) {
        this.deps.storage.unresponsiveEnsNodes[ensNode] = true;
        this.deps.logger.log(`Retry for unresponsive ${toShortString(ensNode)} failed`);
      }
        this.deps.storage.save();
    }
  }

  cancel() {
    this.isCanceled = true;
  }
}

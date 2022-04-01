import { Contract, ethers } from "ethers";
import { getPastContenthashChanges } from "../getPastContenthashChanges";
import { getIpfsHashFromContenthash } from "../getIpfsHashFromContenthash";
import { Storage } from "../types/Storage";
import { isWrapper } from "../isWrapper";
import * as IPFS from 'ipfs-core';
import { pinCid } from "../pinCid";
import { unpinCid } from "../unpinCid";
import { toShortString } from "../toShortString";
import { Logger } from "./Logger";
import { IpfsConfig } from "../config/IpfsConfig";
import { MainDependencyContainer } from "../modules/daemon/daemon.deps";
import { EnsResolver } from "./EnsResolver";

export class CacheRunner {
  deps: MainDependencyContainer;

  constructor(deps: MainDependencyContainer) {
    this.deps = deps;
  }

  //TODO: runned missed events while updating
  async runForPastBlocks(blockCnt: number) {
    this.deps.ensPublicResolvers.forEach(async resolver => {
      const latestBlock = await resolver.ethersProvider.getBlockNumber();

      if (blockCnt !== 0) {
        this.deps.logger.log(`Processing past blocks on ${resolver.getProviderAddress()}...`);
  
        // TODO: mbrizic check if this awaits properly
        await this.processPastBlocks(resolver, latestBlock - blockCnt);
      }
    });
  }

  async runForMissedBlocks() {
    this.deps.ensPublicResolvers.forEach(async resolver => {
      this.deps.logger.log(`Processing missed blocks on ${resolver.getProviderAddress()}...`);

      // TODO: mbrizic check if this awaits properly
      await this.processPastBlocks(resolver, this.deps.storage.lastBlockNumber);
    });
  }

  async listenForEvents() {
    this.deps.ensPublicResolvers.forEach(resolver => {
      const contract = resolver.contract;

      this.deps.logger.log(`Listening for events on ${resolver.getProviderAddress()}...`);

      contract.on("ContenthashChanged", async (ensNode: string, contenthash: string, event: any) => {
        this.deps.logger.log(`----${resolver.getProviderAddress()}------------------------------------------`);
        await this.processEnsIpfs(ensNode, getIpfsHashFromContenthash(contenthash));

        this.deps.storage.lastBlockNumber = event.blockNumber - 1;
        await this.deps.storage.save();
        this.deps.logger.log(`----------------------------------------------`);
      });
    });
  }

  async processPastBlocks(resolver: EnsResolver, blockNumber: number) {
    const resp = await getPastContenthashChanges(resolver, blockNumber);

    await this.processEnsNodes(resp.results.map(x => x.ensNode), resolver.contract);

    this.deps.storage.lastBlockNumber = resp.toBlock;
    await this.deps.storage.save();
  }

  async processUnresponsive() {
    this.deps.logger.log("Processing unresponsive packages...");

    const ensNodes = Object.keys(this.deps.storage.unresponsiveEnsNodes);
    this.deps.storage.unresponsiveEnsNodes = {};

    // await this.processEnsNodes(ensNodes);
  }

  async processEnsIpfs(ensNode: string, ipfsHash: string | undefined): Promise<boolean> {
    const ensIpfsCache = this.deps.storage.ensIpfs;
    const ipfsEnsCache = this.deps.storage.ipfsEns;

    if (!ipfsHash) {
      const savedIpfsHash = ensIpfsCache[ensNode];

      if (savedIpfsHash) {
        this.deps.logger.log("ENS no longer points to an IPFS hash");
        this.deps.logger.log("Unpinning...");

        const success = await unpinCid(this.deps.ipfsNode, this.deps.ipfsConfig, savedIpfsHash);

        if (success) {

          if (ipfsEnsCache[savedIpfsHash]) {
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

    if (Object.keys(this.deps.storage.unresponsiveEnsNodes).includes(ensNode)) {
      this.deps.logger.log(`Ens domain already included in unresponsive list (${Object.keys(this.deps.storage.unresponsiveEnsNodes).length})`);
      return false;
    }

    if (!ipfsEnsCache[ipfsHash]) {
      this.deps.logger.log(`Checking if ${ipfsHash} is a wrapper`);

      const resp = await isWrapper(this.deps.ipfsNode, this.deps.ipfsConfig, this.deps.logger, ipfsHash);

      if (resp === "no") {
        this.deps.logger.log("IPFS hash is not a valid wrapper");
        return false;
      } else if (resp === "timeout") {
        this.deps.storage.unresponsiveEnsNodes[ensNode] = true;
        this.deps.logger.log(`Added ${toShortString(ensNode)} to unresponsive list (${Object.keys(this.deps.storage.unresponsiveEnsNodes).length})`);
        return false;
      }

      const success = await pinCid(this.deps.ipfsNode, this.deps.ipfsConfig, ipfsHash);

      if (!success) {
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

  async processEnsNodes(nodes: string[], contract: Contract) {
    const ensNodes = [...new Set(nodes)];

    this.deps.logger.log(`Found ${ensNodes.length} eligible ENS domains`);

    if (!ensNodes.length) {
      return;
    }

    this.deps.logger.log(`Pinning...`);
    let pinnedCnt = 0;

    for (let i = 0; i < ensNodes.length; i++) {
      const ensNode = ensNodes[i];

      this.deps.logger.log("----------------------------------------------");
      this.deps.logger.log(`Retrieving contenthash for ${toShortString(ensNode)} (${i + 1}/${ensNodes.length})`);

      try {
        const contenthash = await contract.contenthash(ensNode);
        const ipfsHash = getIpfsHashFromContenthash(contenthash);

        this.deps.logger.log("Retrieved IPFS hash for ENS domain");
        const newlyPinned = await this.processEnsIpfs(ensNode, ipfsHash);

        if (newlyPinned) {
          pinnedCnt++;
        }
      } catch (ex) {
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
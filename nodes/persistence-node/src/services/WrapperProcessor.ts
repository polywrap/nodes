import { PinnedWrapperCache } from "./PinnedWrapperCache";
import { getWrapperPinInfo } from "../utils/getWrapperPinInfo";
import { Logger } from "./Logger";
import { PersistenceStateManager } from "./PersistenceStateManager";
import * as IPFS from "ipfs-core";
import { IpfsConfig } from "../config/IpfsConfig";
import { loadFilesFromIpfs } from "../ipfs";
import { ENS_DOMAIN_REGEX } from "../constants/ens-domain-regex";
import { msgpackDecode } from "@polywrap/msgpack-js";
import { trackEnsDomains } from "../utils/trackEnsDomains";

interface IDependencies {
  logger: Logger;
  ipfsNode: IPFS.IPFS;
  ipfsConfig: IpfsConfig;
  persistenceStateManager: PersistenceStateManager;
  pinnedWrapperCache: PinnedWrapperCache;
}

export class WrapperProcessor {
  deps: IDependencies;

  constructor(deps: IDependencies) {
    this.deps = deps;
  }

  async processSingleWrapper(ipfsHash: string): Promise<void> {
    const info = this.deps.persistenceStateManager.getTrackedIpfsHashInfo(ipfsHash);

    const pinnedWrapperInfo = await getWrapperPinInfo(info, this.deps.ipfsNode, this.deps.ipfsConfig.gatewayTimeout);

    if (pinnedWrapperInfo) {
      this.deps.pinnedWrapperCache.cache(pinnedWrapperInfo);
      const ensDomains = await this.extractEnsDomains(pinnedWrapperInfo.cid);
      trackEnsDomains(ensDomains);

      this.deps.logger.log(`Processed ${ipfsHash}`);
    } else {
      throw new Error(`Failed to get pin info for ${ipfsHash}`);
    }
  }

  async processMultipleWrappers(ipfsHashes: string[]): Promise<void> {
    const infos = ipfsHashes.map(ipfsHash => this.deps.persistenceStateManager.getTrackedIpfsHashInfo(ipfsHash));

    const pinnedWrapperInfos = await Promise.all(
      infos.map(info => getWrapperPinInfo(info, this.deps.ipfsNode, this.deps.ipfsConfig.gatewayTimeout)
    ));

    const allEnsDomains = [];
    
    for (let pinnedWrapperInfo of pinnedWrapperInfos) {
      if (pinnedWrapperInfo) {
        this.deps.pinnedWrapperCache.cache(pinnedWrapperInfo);
        const ensDomains = await this.extractEnsDomains(pinnedWrapperInfo.cid);
        allEnsDomains.push(...ensDomains);

        this.deps.logger.log(`Processed ${pinnedWrapperInfo.cid}`);
      } else {
        throw new Error(`Failed to get pin info`);
      }
    }

    trackEnsDomains(allEnsDomains);
  }

  async extractEnsDomains(ipfsHash: string): Promise<string[]> {
    const files = await loadFilesFromIpfs(ipfsHash, this.deps.ipfsNode, this.deps.ipfsConfig.gatewayTimeout);

    if (!files) {
      throw new Error(`Could not load files from IPFS hash ${ipfsHash}`);
    }

    const wrapInfoBuffer = files.find((file) => file.path === "wrap.info")?.content;
    if (!wrapInfoBuffer) {
      throw new Error(`Could not find wrap.info file in ${ipfsHash}`);
    }
    const wrapInfo = JSON.stringify(msgpackDecode(wrapInfoBuffer));

    const domains = [...(wrapInfo.match(ENS_DOMAIN_REGEX) as string[])];

    return domains.filter(x => x.endsWith(".eth"));
  }
}

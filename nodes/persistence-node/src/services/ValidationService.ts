import { IpfsConfig } from "../config/IpfsConfig";
import * as IPFS from 'ipfs-core';
import { Logger } from "./Logger";
import { PersistenceStateManager } from "./PersistenceStateManager";
import { WrapperValidator } from "@polywrap/core-validation";
import { IpfsPackageReader, TrackedIpfsHashInfo } from "../types";

interface IDependencies {
  persistenceStateManager: PersistenceStateManager;
  ipfsNode: IPFS.IPFS;
  ipfsConfig: IpfsConfig;
  wrapperValidator: WrapperValidator;
  logger: Logger;
}

export class ValidationService {
  deps: IDependencies;

  constructor(deps: IDependencies) {
    this.deps = deps;
  }

  async purgeInvalidWrappers(): Promise<void> {
    const wrappers = this.deps.persistenceStateManager.getTrackedIpfsHashInfos()
      .filter(x => x.isWrapper);

    const invalidWrappers: TrackedIpfsHashInfo[] = [];
    let validCnt = 0;

    for(const wrapper of wrappers) {
      const reader = new IpfsPackageReader(this.deps.ipfsNode, wrapper.ipfsHash);
    
      const result = await this.deps.wrapperValidator.validate(reader);

      if (!result.valid) {
        invalidWrappers.push(wrapper);
      } else {
        validCnt++;
      }
    }

    console.log(`Found ${invalidWrappers.length} invalid wrappers`);
    console.log(`Found ${validCnt} valid wrappers`);

    for(const invalidWrapper of invalidWrappers) {
      if(invalidWrapper.isPinned) {
        await this.deps.persistenceStateManager.setIpfsHashInfo(invalidWrapper.ipfsHash, {
          ipfsHash: invalidWrapper.ipfsHash,
          isWrapper: false,
          isPinned: false,
          indexes: invalidWrapper.indexes,
        });
      } else {
        await this.deps.persistenceStateManager.setIpfsHashInfo(invalidWrapper.ipfsHash, {
          ipfsHash: invalidWrapper.ipfsHash,
          isWrapper: false,
          isPinned: false,
          indexes: invalidWrapper.indexes,
        });
      }
    }
  }
}

import { IpfsConfig } from "../config/IpfsConfig";
import * as IPFS from "ipfs-core";
import { Logger } from "./Logger";
import { PersistenceStateManager } from "./PersistenceStateManager";
import { ValidationResult, WasmPackageValidator } from "@polywrap/package-validation";
import { InMemoryFile, InMemoryPackageReader, IpfsPackageReader, TrackedIpfsHashInfo } from "../types";
import { TrackedIpfsHashStatus } from "../types/TrackedIpfsHashStatus";
import { PersistenceService } from "./persistence-service/PersistenceService";
import { loadFilesFromIpfs } from "../ipfs/loadFilesFromIpfs";

interface IDependencies {
  logger: Logger;
  persistenceStateManager: PersistenceStateManager;
  ipfsNode: IPFS.IPFS;
  ipfsConfig: IpfsConfig;
  wasmPackageValidator: WasmPackageValidator;
  persistenceService: PersistenceService;
}

export class ValidationService {
  deps: IDependencies;

  constructor(deps: IDependencies) {
    this.deps = deps;
  }

  async validateIpfsWrapper(ipfsPathOrCID: string): Promise<[string | undefined, ValidationResult | undefined]> {
    const files = await loadFilesFromIpfs(ipfsPathOrCID, this.deps.ipfsNode, this.deps.ipfsConfig.objectGetTimeout);

    if (!files) {
      return [`Could not load files from IPFS hash ${ipfsPathOrCID}`, undefined];
    }

    const reader = new InMemoryPackageReader(files);

    return [undefined, await this.deps.wasmPackageValidator.validate(reader)];
  }

  async validateInMemoryWrapper(files: InMemoryFile[]): Promise<ValidationResult> {
    const reader = new InMemoryPackageReader(files);

    return await this.deps.wasmPackageValidator.validate(reader);
  }

  async purgeInvalidWrappers(): Promise<void> {
    const wrappers = this.deps.persistenceStateManager.getTrackedIpfsHashInfos()
      .filter(
        x => x.status === TrackedIpfsHashStatus.Pinned ||
        x.status === TrackedIpfsHashStatus.Pinning
      );

    const invalidWrappers: TrackedIpfsHashInfo[] = [];
    let validCnt = 0;
    let unresponsiveCnt = 0;

    for(const wrapper of wrappers) {
      const [error, result] = await this.validateIpfsWrapper(wrapper.ipfsHash);

      if (error || !result) {
        const retryCount = wrapper?.unresponsiveInfo?.retryCount || wrapper?.unresponsiveInfo?.retryCount === 0
        ? wrapper?.unresponsiveInfo?.retryCount + 1
        : 0;

        this.deps.persistenceService.scheduleRetry(wrapper.ipfsHash, retryCount, TrackedIpfsHashStatus.ValidWrapperCheck, wrapper.indexes)
        unresponsiveCnt++;
      } else {
        if (!result.valid) {
          invalidWrappers.push(wrapper);
        } else {
          validCnt++;
        }
      }
    }

    this.deps.logger.log(`Found ${invalidWrappers.length} invalid wrappers`);
    this.deps.logger.log(`Found ${validCnt} valid wrappers`);
    this.deps.logger.log(`Found ${unresponsiveCnt} unresponsive wrappers`);

    for(const invalidWrapper of invalidWrappers) {
      if(invalidWrapper.status === TrackedIpfsHashStatus.Pinning) {
        await this.deps.persistenceStateManager.setIpfsHashInfo(invalidWrapper.ipfsHash, {
          ipfsHash: invalidWrapper.ipfsHash,
          status: TrackedIpfsHashStatus.NotAWrapper,
          indexes: invalidWrapper.indexes,
        });
      } else {
        const retryCount = invalidWrapper?.unresponsiveInfo?.retryCount || invalidWrapper?.unresponsiveInfo?.retryCount === 0
        ? invalidWrapper?.unresponsiveInfo?.retryCount + 1
        : 0;
  
        const success = await this.deps.persistenceService.unpinWrapper(invalidWrapper.ipfsHash);
        if(success) {
          await this.deps.persistenceStateManager.setIpfsHashInfo(invalidWrapper.ipfsHash, {
            ipfsHash: invalidWrapper.ipfsHash,
            status: TrackedIpfsHashStatus.NotAWrapper,
            indexes: invalidWrapper.indexes,
          });
        } else {
          this.deps.persistenceService.scheduleRetry(invalidWrapper.ipfsHash, retryCount, TrackedIpfsHashStatus.Unpinning, invalidWrapper.indexes)
        }
      }
    }
  }
}

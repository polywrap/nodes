import { IpfsConfig } from "../config/IpfsConfig";
import * as IPFS from "ipfs-core";
import { Logger } from "./Logger";
import { PersistenceStateManager } from "./PersistenceStateManager";
import { ValidationResult as ValidationResultV0_1, ValidationFailReason as ValidationFailReasonV0_1, WasmPackageValidator as WasmPackageValidatorV0_1 } from "@polywrap/package-validation/v0_1";
import { ValidationResult as ValidationResultV0_2, ValidationFailReason as ValidationFailReasonV0_2, WasmPackageValidator as WasmPackageValidatorV0_2 } from "@polywrap/package-validation/v0_2";
import { ValidationResult as ValidationResultV0_3, ValidationFailReason as ValidationFailReasonV0_3, WasmPackageValidator as WasmPackageValidatorV0_3 } from "@polywrap/package-validation/v0_3";
import { InMemoryFile, InMemoryPackageReader, TrackedIpfsHashInfo } from "../types";
import { TrackedIpfsHashStatus } from "../types/TrackedIpfsHashStatus";
import { PersistenceService } from "./persistence-service/PersistenceService";
import { loadFilesFromIpfs } from "../ipfs";
import { PersistenceConfig } from "../config/PersistenceConfig";
import { ValidatorManager } from "./validator-manager/ValidatorManager";
import { AllValidatorResult } from "./validator-manager/utils/types/AllValidatorResult";

interface IDependencies {
  logger: Logger;
  persistenceStateManager: PersistenceStateManager;
  ipfsNode: IPFS.IPFS;
  ipfsConfig: IpfsConfig;
  persistenceService: PersistenceService;
  validatorManager: ValidatorManager;
}


export class ValidationService {
  deps: IDependencies;

  constructor(deps: IDependencies) {
    this.deps = deps;
  }

  async validateIpfsWrapper(
    ipfsPathOrCID: string
  ): Promise<AllValidatorResult & { unresponsive?: boolean }> {
    const files = await loadFilesFromIpfs(ipfsPathOrCID, this.deps.ipfsNode, this.deps.ipfsConfig.gatewayTimeout);

    if (!files) {
      return { 
        valid: false, 
        unresponsive: true,
        failReason: `Could not load files from IPFS: ${ipfsPathOrCID}`,
      };
    }

    return await this.deps.validatorManager.validateWithAllValidators(files);
  }

  async validateInMemoryWrapper(
    files: InMemoryFile[]
  ): Promise<AllValidatorResult> {
    return await this.deps.validatorManager.validateWithAllValidators(files);
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
      const result = await this.validateIpfsWrapper(wrapper.ipfsHash);

      if (result.unresponsive) {
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

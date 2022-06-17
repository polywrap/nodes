import * as IPFS from 'ipfs-core';
import { Logger } from '../services/Logger';
import { IpfsPackageReader } from '../types';
import { WrapperConstraints, WrapperValidator } from '@web3api/core-validation';

export const isValidWrapper = async (
  ipfsNode: IPFS.IPFS, 
  wrapperConstraints: WrapperConstraints, 
  logger: Logger, 
  cid: string
): Promise<"yes" | "no" | "timeout"> => {
  try {
    const validator = new WrapperValidator(wrapperConstraints);
    const reader = new IpfsPackageReader(ipfsNode, `/ipfs/${cid}`);

    const result = await validator.validate(reader);

    if(!result.valid) {
      logger.log(`IPFS hash ${cid} is not a valid wrapper. Reason: ${result.failReason}`);
    }

    return result.valid ? "yes" : "no";
  } catch {
    return "timeout";
  }
};
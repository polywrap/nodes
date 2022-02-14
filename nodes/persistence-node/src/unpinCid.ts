import * as IPFS from 'ipfs-core';
import { IpfsConfig } from './config/IpfsConfig';

export const unpinCid = async (ipfs: IPFS.IPFS, ipfsConfig: IpfsConfig, cid: string): Promise<boolean> => {
  try {
    await ipfs.pin.rm(cid, {
      timeout: ipfsConfig.unpinTimeout,
    });

    console.log(`Unpinned ${cid}`);
      return true;
  } catch (err) {
    console.log(err);
    return false;
  }
};
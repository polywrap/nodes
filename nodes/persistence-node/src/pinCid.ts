import * as IPFS from 'ipfs-core';
import { IpfsConfig } from './config/IpfsConfig';

export const pinCid = async (ipfs: IPFS.IPFS, ipfsConfig: IpfsConfig, cid: string): Promise<boolean> => {
  console.log(`Pinning ${cid}...`);
 
  try {
    await ipfs.pin.add(cid, {
      timeout: ipfsConfig.pinTimeout,
    });

    console.log(`Pinned ${cid}`);
      return true;
  } catch (err) {
    console.log(err);
    return false;
  }
};
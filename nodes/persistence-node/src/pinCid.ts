import * as IPFS from 'ipfs-core';
import { PersistenceNodeConfig } from './config/PersistenceNodeConfig';

export const pinCid = async (ipfs: IPFS.IPFS, config: PersistenceNodeConfig, cid: string): Promise<boolean> => {
  console.log(`Pinning ${cid}...`);
 
  try {
    await ipfs.pin.add(cid, {
      timeout: config.pinTimeout,
    });

    console.log(`Pinned ${cid}`);
      return true;
  } catch (err) {
    console.log(err);
    return false;
  }
};
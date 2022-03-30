import * as IPFS from 'ipfs-core';
import { PersistenceNodeConfig } from './config/PersistenceNodeConfig';

export const unpinCid = async (ipfs: IPFS.IPFS, config: PersistenceNodeConfig, cid: string): Promise<boolean> => {
  try {
    await ipfs.pin.rm(cid, {
      timeout: config.unpinTimeout,
    });

    console.log(`Unpinned ${cid}`);
      return true;
  } catch (err) {
    console.log(err);
    return false;
  }
};
import * as IPFS from 'ipfs-core';

export const isCID = (cid: string): boolean => {
  try {
    IPFS.CID.parse(cid);
    return true;
  } catch {
    return false;
  }
};
import * as IPFS from 'ipfs-core';
import { IpfsApiError } from "../types/IpfsApiError";

export const getIpfsFileStat = async (ipfs: IPFS.IPFS, ipfsPath: string) => {
  return ipfs.files.stat(`/ipfs/${ipfsPath}`)
    .catch(err => {
      const errorMessage: string | null = typeof err?.message === "string" ? err.message : null;
      if (!!errorMessage) {
        throw new IpfsApiError(errorMessage)
      }
      
      throw err;
    });
};

import * as IPFS from 'ipfs-core';
import { IpfsApiError } from "../types/IpfsApiError";

export const resolveIpfsPath = async (ipfs: IPFS.IPFS, hash: string) => {
  return ipfs.resolve(`/ipfs/${hash}`)
    .catch(err => {
      const errorMessage: string | null = typeof err?.message === "string" ? err.message : null;
      if (!!errorMessage) {
        throw new IpfsApiError(errorMessage);
      }
      throw err;
    });
};

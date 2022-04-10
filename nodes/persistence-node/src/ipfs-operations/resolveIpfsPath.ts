import * as IPFS from 'ipfs-core';
import { NotFoundError } from "../types/NotFoundError";

export const resolveIpfsPath = async (ipfs: IPFS.IPFS, hash: string) => {
  return ipfs.resolve(`/ipfs/${hash}`)
    .catch(err => {
      const errorMessage: string | null = typeof err?.message === "string" ? err.message : null;
      if (errorMessage?.includes("invalid argument")) {
        throw new NotFoundError(`Could not resolve hash: ${hash}`);
      }
      throw err;
    });
};

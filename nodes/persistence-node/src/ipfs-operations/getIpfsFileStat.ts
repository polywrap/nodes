import * as IPFS from 'ipfs-core';
import { NotFoundError } from "../types/NotFoundError";

export const getIpfsFileStat = async (ipfs: IPFS.IPFS, ipfsPath: string) => {
  return ipfs.files.stat(`/ipfs/${ipfsPath}`)
    .catch(err => {
      const errorMessage: string | null = typeof err?.message === "string" ? err.message : null;
      if (errorMessage?.includes("Invalid CID version")) {
        throw new NotFoundError(`Could not resolve ipfs path: ${ipfsPath}`)
      }
      if (errorMessage?.includes("To parse non base32 or base58btc encoded CID multibase decoder must be provided")) {
        throw new NotFoundError(`To parse non base32 or base58btc encoded CID multibase decoder must be provided. 
          ipfsPath argument: ${ipfsPath}`);
      }
      throw err;
    });
};

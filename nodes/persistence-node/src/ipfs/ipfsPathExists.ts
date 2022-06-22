import * as IPFS from "ipfs-core";

export const ipfsPathExists = async (ipfs: IPFS.IPFS, ipfsPath: string, timeout: number | undefined = undefined, signal: AbortSignal | undefined = undefined): Promise<boolean> => {
  try {
    await ipfs.resolve(ipfsPath, {
      timeout,
      signal,
    });
    return true;
  } catch {
    return false;
  }
};
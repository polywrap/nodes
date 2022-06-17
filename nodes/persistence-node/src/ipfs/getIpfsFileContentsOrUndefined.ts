import * as IPFS from 'ipfs-core';
import { getIpfsFileContents } from './getIpfsFileContents';

export const getIpfsFileContentsOrUndefined = async (
  ipfs: IPFS.IPFS, 
  hash: string, 
  timeout: number,
  signal: AbortSignal | undefined = undefined, 
): Promise<Buffer | undefined> => {
  try {
    const buffer = await getIpfsFileContents(ipfs, hash, timeout, signal);
    return buffer;
  }
  catch {
    return undefined;
  }
};
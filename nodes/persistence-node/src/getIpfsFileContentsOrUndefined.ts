import * as IPFS from 'ipfs-core';
import { getIpfsFileContents } from './getIpfsFileContents';

export const getIpfsFileContentsOrUndefined = async (
  ipfs: IPFS.IPFS, 
  hash: string, 
  signal: AbortSignal, 
  timeout: number
): Promise<Buffer | undefined> => {
  try {
    const buffer = await getIpfsFileContents(ipfs, hash, signal, timeout);
    return buffer;
  }
  catch {
    return undefined;
  }
};
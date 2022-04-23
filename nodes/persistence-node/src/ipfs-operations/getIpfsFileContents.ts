import * as IPFS from 'ipfs-core';
import { IpfsApiError } from '../types/IpfsApiError';
import { asyncIterableToArray } from '../utils/asyncIterableToArray';

export const getIpfsFileContents = async (ipfs: IPFS.IPFS, hash: string): Promise<Buffer> => {
  const chunks = await asyncIterableToArray(ipfs.cat(hash))
    .catch(err => { 
      const errorMessage: string | null = typeof err?.message === "string" ? err.message : null;
      if (!!errorMessage) {
        throw new IpfsApiError(errorMessage);
      }
      throw err;
    });

  let data: Uint8Array = new Uint8Array();

  for (const chunk of chunks) {
    const temp = new Uint8Array(data.length + chunk.length);
    temp.set(data);
    temp.set(chunk, data.length);
    data = temp;
  }

  const buffer = Buffer.from(data);

  return buffer;
};

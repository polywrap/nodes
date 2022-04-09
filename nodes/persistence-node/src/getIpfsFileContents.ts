import * as IPFS from 'ipfs-core';
import { NotFoundError } from './types/FileNotFoundError';

export const getIpfsFileContents = async (ipfs: IPFS.IPFS, hash: string): Promise<Buffer> => {
  try {
    const stream = ipfs.cat(hash);

    let data: Uint8Array = new Uint8Array();

    for await (const chunk of stream) {
      const temp = new Uint8Array(data.length + chunk.length);
      temp.set(data);
      temp.set(chunk, data.length);
      data = temp;
    }

    const buffer = Buffer.from(data);

    return buffer;
  } catch (err: any) {
    const errorMessage: string | null = typeof err?.message === "string" ? err.message : null;
    
    if (errorMessage?.includes("Invalid CID version")) {
      throw new NotFoundError(`File not found for hash: ${hash}`);
    }

    if (errorMessage?.includes("this dag node is a directory")) {
      //TODO: should we handle this differently?
      throw err;
    }

    throw err;
  }
};
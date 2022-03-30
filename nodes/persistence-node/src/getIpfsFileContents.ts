import * as IPFS from 'ipfs-core';

export const getIpfsFileContents = async (ipfs: IPFS.IPFS, hash: string): Promise<Buffer> => {
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
};
import * as IPFS from "ipfs-core";
import { create as createIpfsHttpClient } from "ipfs-http-client"

export const tryIpfsRequestWithFallbacks = async <TReturn>(
  ipfsNode: IPFS.IPFS, 
  gateways: string[], 
  request: (ipfsNode: IPFS.IPFS) => TReturn
): Promise<TReturn> => {
  const allNodes = [ipfsNode, ...gateways.map(x => createIpfsHttpClient({
    url: x,
  }))];

  const errors: any[] = [];

  for (const node of allNodes) {
    try {
      const result = await request(node);
      return result;
    } catch (err) {
      errors.push(err);
      continue;
    }
  }

  throw errors;
};

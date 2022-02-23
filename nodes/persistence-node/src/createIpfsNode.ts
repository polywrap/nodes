import { create as createInternalpfsNode, IPFS } from 'ipfs-core';
import { create as createIpfsHttpClient } from 'ipfs-http-client'

export const createIpfsNode = async (ipfsUrl?: string): Promise<IPFS> => {

  let ipfsNode: IPFS;

  if (ipfsUrl) {
    ipfsNode = await createIpfsHttpClient({
      url: ipfsUrl,
    });
  } else {
    ipfsNode = await createInternalpfsNode();
  }

  const version = await ipfsNode.version()
  console.log('Version:', version.version)

  console.log("IPFS ID", await ipfsNode.id());
  console.log("isOnline", await ipfsNode.isOnline());

  return ipfsNode;
};
import { create as createInternalpfsNode, IPFS } from 'ipfs-core';
import { create as createIpfsHttpClient } from 'ipfs-http-client'
import { IpfsConfig } from './config/IpfsConfig';

interface IDeps {
  ipfsConfig: IpfsConfig
}

export const createIpfsNode = async (deps: IDeps): Promise<IPFS> => {
  const ipfsUrl = deps.ipfsConfig.ipfsUrl

  let ipfsNode: IPFS;

  if (ipfsUrl) {
    ipfsNode = await createIpfsHttpClient({
      url: ipfsUrl,
    });
    console.log(`Using IPFS node at ${ipfsUrl}`);
  } else {
    ipfsNode = await createInternalpfsNode();
    console.log("Using local IPFS node");
  }

  const version = await ipfsNode.version()
  console.log('Version:', version.version)

  console.log("IPFS ID", await ipfsNode.id());
  console.log("isOnline", await ipfsNode.isOnline());

  return ipfsNode;
};
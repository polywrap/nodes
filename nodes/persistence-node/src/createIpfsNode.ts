import { create as createInternalpfsNode, IPFS } from 'ipfs-core';
import { create as createIpfsHttpClient } from 'ipfs-http-client'
import { IpfsConfig } from './config/IpfsConfig';

interface IDeps {
  ipfsConfig: IpfsConfig
}

export const createIpfsNode = async (deps: IDeps): Promise<IPFS> => {
  const externalIpfsProvider = deps.ipfsConfig.externalIpfsProvider

  let ipfsNode: IPFS;

  if (externalIpfsProvider) {
    ipfsNode = await createIpfsHttpClient({
      url: externalIpfsProvider,
    });
    console.log(`Using IPFS node at ${externalIpfsProvider}`);
  } else {
    ipfsNode = await createInternalpfsNode();
    console.log("Using local IPFS node");
  }

  const version = await ipfsNode.version()
  console.log(`Version: ${version.version}`)

  const files = ipfsNode.pin.ls();

  let counter = 0;
  for await (let file of files) {
    counter++;
  }
  console.log("FILES:", counter)

  console.log(`IPFS ID`, await ipfsNode.id());
  console.log(`isOnline: ${ipfsNode.isOnline()}`);

  return ipfsNode;
};
import { create as createInternalpfsNode, IPFS } from 'ipfs-core';
import { create as createIpfsHttpClient } from 'ipfs-http-client'
import { PersistenceNodeConfig } from './config/PersistenceNodeConfig';

interface IDeps {
  persistenceNodeConfig: PersistenceNodeConfig
}

export const createIpfsNode = async (deps: IDeps): Promise<IPFS> => {
  const externalIpfsProvider = deps.persistenceNodeConfig.externalIpfsProvider

  let ipfsNode: IPFS;

  if (externalIpfsProvider) {
    ipfsNode = createIpfsHttpClient({
      url: externalIpfsProvider,
    });
    console.log(`Using IPFS node at ${externalIpfsProvider}`);
  } else {
    ipfsNode = await createInternalpfsNode();
    console.log("Using integrated IPFS node");
  }

  const version = await ipfsNode.version()
  console.log(`IPFS Node Version: ${version.version}`)

  console.log(`IPFS ID: `, await ipfsNode.id());
  console.log(`IPFS Online: ${await ipfsNode.isOnline()}`);

  return ipfsNode;
};
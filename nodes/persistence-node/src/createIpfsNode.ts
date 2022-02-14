import * as IPFS from 'ipfs-core'

export const createIpfsNode = async (): Promise<IPFS.IPFS> => {
  const ipfsNode = await IPFS.create();
  const version = await ipfsNode.version()
  console.log('Version:', version.version)

  console.log("IPFS ID", await ipfsNode.id());
  console.log("isOnline", await ipfsNode.isOnline());

  return ipfsNode;
};
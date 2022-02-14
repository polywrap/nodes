import * as IPFS from 'ipfs-core';

export const addFilesAsDirToIpfs = async (
  files: { path: string, content: Buffer }[], 
  options: { onlyHash: boolean }, 
  ipfs: IPFS.IPFS
) => {
  let rootCID = "";
  for await (const file of ipfs.addAll(
    files,
    {
      wrapWithDirectory: true,
      pin: false,
      onlyHash: options.onlyHash
    }
  )) {
    if (file.path.indexOf("/") === -1) {
      rootCID = file.cid.toString();
    }
  }

  return rootCID;
};
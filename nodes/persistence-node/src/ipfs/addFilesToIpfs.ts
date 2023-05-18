import * as IPFS from "ipfs-core";
import { InMemoryFile } from "../types";
import { IpfsAddResult } from "../types/IpfsAddResult";
import { IpfsApi } from "../config/IpfsConfig";
import { create as createIpfsHttpClient } from "ipfs-http-client"

export const addFilesToIpfs = async (
  files: InMemoryFile[], 
  options: { onlyHash: boolean }, 
  ipfs: IPFS.IPFS,
  apis: IpfsApi[]
): Promise<{
  rootCid?: string;
  addedFiles: IpfsAddResult[]
}> => {
  let addedFiles: IpfsAddResult[] = [];

  for await (const file of ipfs.addAll(
    files.filter(x => x.content && x.content.length),
    {
      wrapWithDirectory: true,
      pin: false,
      onlyHash: options.onlyHash
    }
  )) {
    addedFiles.push(file);
  }


  const rootDir = addedFiles.find((x: IpfsAddResult) => x.path === "");
  const rootCid = rootDir?.cid;

  for (let api of apis) {
    const client = createIpfsHttpClient(api);

    for await (const file of client.addAll(
      files.filter(x => x.content && x.content.length),
      {
        wrapWithDirectory: true,
        pin: false,
        onlyHash: options.onlyHash
      }
    )) {
      addedFiles.push(file);
    }
  }

  return {
    rootCid: rootCid?.toString(), 
    addedFiles
  };
};
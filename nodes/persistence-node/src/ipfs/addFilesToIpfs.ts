import * as IPFS from "ipfs-core";
import { InMemoryFile } from "../types";
import { IpfsAddResult } from "../types/IpfsAddResult";

export const addFilesToIpfs = async (
  files: InMemoryFile[], 
  options: { onlyHash: boolean }, 
  ipfs: IPFS.IPFS
): Promise<IpfsAddResult[]> => {
  let addedFiles: IpfsAddResult[] = [];

  for await (const file of ipfs.addAll(
    files,
    {
      wrapWithDirectory: true,
      pin: false,
      onlyHash: options.onlyHash
    }
  )) {
    addedFiles.push(file);
  }

  return addedFiles;
};
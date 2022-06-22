import * as IPFS from "ipfs-core";
import { IpfsAddResult } from "../types/IpfsAddResult";

export const addFilesToIpfs = async (
  files: { path: string, content?: Buffer }[], 
  options: { onlyHash: boolean }, 
  ipfs: IPFS.IPFS
): Promise<IpfsAddResult[]> => {
  let addedFiles: IpfsAddResult[] = [];

  for await (const file of ipfs.addAll(
    files,
    {
      wrapWithDirectory: false,
      pin: false,
      onlyHash: options.onlyHash
    }
  )) {
    addedFiles.push(file);
  }

  return addedFiles;
};
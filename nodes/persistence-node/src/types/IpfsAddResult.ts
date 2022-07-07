import * as IPFS from "ipfs-core";

export type IpfsAddResult = {
  cid: IPFS.CID
  size: number
  path: string
};
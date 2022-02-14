import * as IPFS from 'ipfs-core';
import { IpfsConfig } from './config/IpfsConfig';
import { nudgeIpfsHash } from './nudgeIpfsHash';
import { sleep } from './sleep';

export const isWrapper = async (ipfs: IPFS.IPFS, ipfsConfig: IpfsConfig, cid: string): Promise<"yes" | "no" | "timeout"> => {
  try {
    const info = await ipfs.object.get(IPFS.CID.parse(cid), {
      timeout: ipfsConfig.objectGetTimeout,
    });

    return info.Links.some(x => x.Name === 'web3api.yaml')
      ? "yes"
      : "no";
  } catch (e) {
    const success = await nudgeIpfsHash(ipfsConfig, cid);

    if(!success) {
      return "timeout";
    }

    try {
      //Waiting a bit to let IPFS catch up
      await sleep(10000);

      const info = await ipfs.object.get(IPFS.CID.parse(cid), {
        timeout: ipfsConfig.objectGetTimeout,
      });
  
      return info.Links.some(x => x.Name === 'web3api.yaml')
        ? "yes"
        : "no";
    } catch (e) {
      console.log(e);
      return "timeout";
    }
  }
};
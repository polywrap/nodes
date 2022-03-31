import axios from "axios";
import { IpfsConfig } from "./config/IpfsConfig";

export const nudgeIpfsHash = async (ipfsConfig: IpfsConfig, cid: string): Promise<boolean> => {
  console.log(`Nudging IPFS hash ${cid} with gateway...`);
  
  return await axios({
    method: 'get',
    url: `${ipfsConfig.gatewayURI}/${cid}`,
    timeout: ipfsConfig.gatewayTimeout,
  })
  .then(() => {
    console.log(`Fetched from ${ipfsConfig.gatewayURI}`);

    return true;
  }, () => {
    console.log(`Could not fetch from ${ipfsConfig.gatewayURI}`);

    return false;
  });
};

import axios from "axios";
import { PersistenceNodeConfig } from "./config/PersistenceNodeConfig";

export const nudgeIpfsHash = async (config: PersistenceNodeConfig, cid: string): Promise<boolean> => {
  console.log(`Nudging IPFS hash ${cid} with gateway...`);
  
  return await axios({
    method: 'get',
    url: `${config.gatewayURI}/${cid}`,
    timeout: config.gatewayTimeout,
  })
  .then(() => {
    console.log(`Fetched from ${config.gatewayURI}`);

    return true;
  }, () => {
    console.log(`Could not fetch from ${config.gatewayURI}`);

    return false;
  });
};

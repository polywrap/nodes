import axios from "axios";
import { IpfsConfig } from "./config/IpfsConfig";
import { Logger } from "./services/Logger";

export const nudgeIpfsHash = async (ipfsConfig: IpfsConfig, cid: string, logger: Logger): Promise<boolean> => {
  logger.log(`Nudging IPFS hash ${cid} with gateway...`);
  
  return await axios({
    method: 'get',
    url: `${ipfsConfig.gatewayURI}/${cid}`,
    timeout: ipfsConfig.gatewayTimeout,
  })
  .then(() => {
    logger.log(`Fetched from ${ipfsConfig.gatewayURI}`);

    return true;
  }, () => {
    logger.log(`Could not fetch from ${ipfsConfig.gatewayURI}`);

    return false;
  });
};

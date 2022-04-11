import { isValidUrl } from "../utils/isValidUrl";
import { Config } from "./Config";

export class IpfsConfig {
  externalIpfsProvider?: string;
  gatewayURI: string;
  objectGetTimeout: number;
  pinTimeout: number;
  unpinTimeout: number;
  gatewayTimeout: number;

  constructor({ config }: { config: Config }) {
    this.externalIpfsProvider = getValidUrlOrUndefined(config.ipfs.provider);
    this.gatewayURI = config.ipfs.gateway;
    this.objectGetTimeout = config.timeouts.objectGetTimeout;
    this.pinTimeout = config.timeouts.pinTimeout;
    this.unpinTimeout = config.timeouts.unpinTimeout;
    this.gatewayTimeout = config.timeouts.gatewayTimeout;
  }
}

function getValidUrlOrUndefined(url: string | undefined) {
  if (url?.length === 0) {
    return undefined;
  }

  if (isValidUrl(url)) {
    return url;
  } else {
    console.log("Invalid URL supplied for EXTERNAL_IPFS_PROVIDER setting");
    process.exit();
  }
}
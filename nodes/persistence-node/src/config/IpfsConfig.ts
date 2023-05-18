import * as IPFS from "ipfs-http-client";
import { isValidUrl } from "../utils/isValidUrl";
import { Config } from "./Config";

export class IpfsConfig {
  externalIpfsProvider?: string;
  gateways: string[];
  gatewayTimeout: number;
  pinTimeout: number;
  unpinTimeout: number;
  apis: IpfsApi[] = [];

  constructor({ config }: { config: Config }) {
    this.externalIpfsProvider = getValidUrlOrUndefined(config.ipfs.provider);
    this.gateways = config.ipfs.gateways;
    this.gatewayTimeout = config.ipfs.timeouts.gatewayTimeout;
    this.pinTimeout = config.ipfs.timeouts.pinTimeout;
    this.unpinTimeout = config.ipfs.timeouts.unpinTimeout;
    this.apis = config.ipfs.apis;
  }
}

export type IpfsApi = IPFS.Options;

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
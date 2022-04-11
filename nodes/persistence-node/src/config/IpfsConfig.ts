import { isValidUrl } from "../utils/isValidUrl";
import config from "./config.json";

export class IpfsConfig {
  externalIpfsProvider = getValidUrlOrUndefined(config.ipfs.provider);
  gatewayURI = config.ipfs.gateway ?? "https://ipfs.io/ipfs";
  objectGetTimeout = tryParseInt(config.timeouts.objectGetTimeout) ?? 15000;
  pinTimeout = tryParseInt(config.timeouts.pinTimeout) ?? 30000;
  unpinTimeout = tryParseInt(config.timeouts.unpinTimeout) ?? 30000;
  gatewayTimeout = tryParseInt(config.timeouts.gatewayTimeout) ?? 15000;
}

function tryParseInt(num: number | string) {
  return parseInt(num as string);
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
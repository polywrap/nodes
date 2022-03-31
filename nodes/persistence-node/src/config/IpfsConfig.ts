import { isValidUrl } from "../utils/isValidUrl";
import config from "./config.json";

export class IpfsConfig {
  externalIpfsProvider = getValidUrlOrUndefined(config.persistenceNode.ipfs.provider);
  gatewayURI = config.persistenceNode.ipfs.gateway ?? "https://ipfs.io/ipfs";
  objectGetTimeout = tryParseInt(config.persistenceNode.timeouts.objectGetTimeout) ?? 15000;
  pinTimeout = tryParseInt(config.persistenceNode.timeouts.pinTimeout) ?? 30000;
  unpinTimeout = tryParseInt(config.persistenceNode.timeouts.unpinTimeout) ?? 30000;
  gatewayTimeout = tryParseInt(config.persistenceNode.timeouts.gatewayTimeout) ?? 15000;
}

function tryParseInt(num: number | string) {
  return parseInt(num as string);
}

function getValidUrlOrUndefined(url: string | undefined) {
  if (isValidUrl(url)) {
    return url;
  } else {
    return undefined;
  }
}
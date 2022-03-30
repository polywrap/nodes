import { isValidUrl } from "../utils/isValidUrl";
import config from "./persistence-node.config.json";

export class PersistenceNodeConfig {
  externalIpfsProvider = getValidUrlOrUndefined(config.ipfs.provider);
  gatewayURI = config.ipfs.gateway ?? "https://ipfs.io/ipfs";
  objectGetTimeout = tryParseInt(config.timeouts.objectGetTimeout) ?? 15000;
  pinTimeout = tryParseInt(config.timeouts.pinTimeout) ?? 30000;
  unpinTimeout = tryParseInt(config.timeouts.unpinTimeout) ?? 30000;
  gatewayTimeout = tryParseInt(config.timeouts.gatewayTimeout) ?? 15000;
  adminRpcApiPort = config.adminRpcApiPort ?? 6051;
  loggerEnabled = !!config.loggerEnabled;
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
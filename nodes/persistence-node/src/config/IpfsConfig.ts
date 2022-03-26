import { isValidUrl } from "../utils/isValidUrl";

export class IpfsConfig {
  externalIpfsProvider = getValidUrlOrUndefined(process.env.EXTERNAL_IPFS_PROVIDER);
  gatewayURI = process.env.IPFS_GATEWAY ?? "https://ipfs.io/ipfs";
  objectGetTimeout = process.env.IPFS_OBJECT_GET_TIMEOUT ? parseInt(process.env.IPFS_OBJECT_GET_TIMEOUT) : 15000;
  pinTimeout = process.env.IPFS_PIN_TIMEOUT ? parseInt(process.env.IPFS_PIN_TIMEOUT) : 30000;
  unpinTimeout = process.env.IPFS_UNPIN_TIMEOUT ? parseInt(process.env.IPFS_UNPIN_TIMEOUT) : 30000;
  gatewayTimeout = process.env.IPFS_GATEWAY_TIMEOUT ? parseInt(process.env.IPFS_GATEWAY_TIMEOUT) : 15000;
}

function getValidUrlOrUndefined(url: string | undefined) {
  if (isValidUrl(url)) {
    return url;
  } else {
    return undefined;
  }
}
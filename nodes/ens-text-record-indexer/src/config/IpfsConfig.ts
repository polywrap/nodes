import { isValidUrl } from "../utils/isValidUrl";
import { Config } from "./Config";

export class IpfsConfig {
  externalIpfsProvider?: string;

  constructor({ config }: { config: Config }) {
    this.externalIpfsProvider = getValidUrlOrUndefined(config.ipfs.provider);
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
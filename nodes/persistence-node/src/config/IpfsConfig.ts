export class IpfsConfig {
  ipfsProvider = process.env.IPFS_PROVIDER ?? "http://localhost:5001";
  gatewayURI = process.env.IPFS_GATEWAY ?? "https://ipfs.io/ipfs";
  objectGetTimeout = parseInt(process.env.IPFS_OBJECT_GET_TIMEOUT!) ?? 15000;
  pinTimeout = parseInt(process.env.IPFS_PIN_TIMEOUT!) ?? 30000;
  unpinTimeout = parseInt(process.env.IPFS_UNPIN_TIMEOUT!) ?? 30000;
  gatewayTimeout = parseInt(process.env.IPFS_GATEWAY_TIMEOUT!) ?? 15000;
}

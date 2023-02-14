import { Config } from "./Config";

export type EnsResolverType = "v1" | "v2";

export class EnsNetworkConfig {
  name: string;
  provider: string;
  chainId: number;
  resolverAddr: string;
  resolverType: EnsResolverType;
  resolverAbi: string[];
  fastSync?: {
    domain: string;
    network: string;
  };

  constructor({ config }: { config: Config }) {
    this.name = config.network.name;
    this.provider = config.network.provider;
    this.chainId = config.network.chainId;
    this.resolverAddr = config.network.ensResolverAddress;

    if (config.network.resolverType !== "v1" && config.network.resolverType !== "v2") {
      throw new Error(`Invalid resolver type: ${config.network.resolverType}`);
    }
    this.resolverType = config.network.resolverType as EnsResolverType;
    this.resolverAbi = this.resolverType === "v1" 
      ? [
        "function contenthash(bytes32 node) external view returns (bytes memory)",
        "function text(bytes32 node, string calldata key) external view returns (bytes memory)",
        "event TextChanged(bytes32 indexed node, string indexed indexedKey, string key)",
      ]
      : [
        "function contenthash(bytes32 node) external view returns (bytes memory)",
        "function text(bytes32 node, string calldata key) external view returns (bytes memory)",
        "event TextChanged(bytes32 indexed node, string indexed indexedKey, string key, string value)",
      ];
    if (config.network.fastSync) {
      this.fastSync = config.network.fastSync;
    }
  }
}

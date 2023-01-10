import { Config } from "./Config";

export class EnsNetworkConfig {
  name: string;
  provider: string;
  chainId: number;
  resolverAddr: string;
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
    this.resolverAbi =  [
      "function contenthash(bytes32 node) external view returns (bytes memory)",
      "function text(bytes32 node, string calldata key) external view returns (bytes memory)",
      "event TextChanged(bytes32 indexed node, string indexed indexedKey, string key)",
    ];
    if (config.network.fastSync) {
      this.fastSync = config.network.fastSync;
    }
  }
}

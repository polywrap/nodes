import { Config } from "./Config";

export class EnsNetworkConfig {
  name: string;
  provider: string;
  chainId: number;
  resolverAddr: string;
  resolverAbi: string[];

  constructor({ config }: { config: Config }) {
    this.name = config.network.name;
    this.provider = config.network.provider;
    this.chainId = config.network.chainId;
    this.resolverAddr = config.network.ensResolverAddress;
    this.resolverAbi =  [
      "function contenthash(bytes32 node) external view returns (bytes memory)",
      "event ContenthashChanged(bytes32 indexed node, bytes hash)"
    ];
  }
}

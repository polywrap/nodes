import config from "./config.json";

// TODO: Implement multiple logic here:

export interface EnsNetworkConfig {
  provider: string,
  ResolverAddr: string
  ResolverAbi: string[]
}

export class EnsConfig {
  networks = mapNetworksFromConfig();
}

function mapNetworksFromConfig() {
  return config.ensIndexer.networks.map(network => {
    return {
      provider: network.provider,
      ResolverAddr: network.ensResolverAddress,
      ResolverAbi: [
        "function contenthash(bytes32 node) external view returns (bytes memory)",
        "event ContenthashChanged(bytes32 indexed node, bytes hash)"
      ]
    };
  });
}

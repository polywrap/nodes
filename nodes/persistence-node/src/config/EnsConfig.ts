import config from "./config.json";

export interface EnsNetworkConfig {
  network: string,
  chainId: number,
  resolverAddr: string
  resolverAbi: string[]
}

export class EnsConfig {
  networks = mapNetworksFromConfig();
}

function mapNetworksFromConfig() {
  return config.ensIndexer.networks.map(network => {
    return {
      network: network.network,
      chainId: network.chainId,
      resolverAddr: network.ensResolverAddress,
      resolverAbi: [
        "function contenthash(bytes32 node) external view returns (bytes memory)",
        "event ContenthashChanged(bytes32 indexed node, bytes hash)"
      ]
    };
  });
}

import config from "./config.json";

// TODO: Implement multiple logic here:

export class EnsConfig {
  ResolverAddr = config.ensIndexer.networks[0].ensResolverAddress ?? "0xf6305c19e814d2a75429Fd637d01F7ee0E77d615";
  ResolverAbi =  [
    "function contenthash(bytes32 node) external view returns (bytes memory)",
    "event ContenthashChanged(bytes32 indexed node, bytes hash)"
  ];
}

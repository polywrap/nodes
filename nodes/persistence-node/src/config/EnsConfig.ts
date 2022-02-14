export class EnsConfig {
  ResolverAddr = process.env.ENS_RESOLVER_ADDR ?? "0xf6305c19e814d2a75429Fd637d01F7ee0E77d615";
  ResolverAbi =  [
    "function contenthash(bytes32 node) external view returns (bytes memory)",
    "event ContenthashChanged(bytes32 indexed node, bytes hash)"
  ];
}

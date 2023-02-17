export const defaultConfigs = {
  main: {
    requestInterval: 15000,
    maxBlockRangePerRequest: 4999,
    loggerEnabled: true,
    apiPort: 8085,
    ipfs: {
      provider: "http://localhost:5001",
    }
  },
  network: {
    mainnet: {
      name: "mainnet",
      provider: "mainnet",
      chainId: 1,
      ensResolverAddress: "0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41",
      resolverType: "v1",
    },
    goerli: {
      name: "goerli",
      provider: "goerli",
      chainId: 5,
      ensResolverAddress: "0xE264d5bb84bA3b8061ADC38D3D76e6674aB91852",
      resolverType: "v2",
    }
  }
};
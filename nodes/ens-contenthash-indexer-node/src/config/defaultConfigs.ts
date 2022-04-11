export const defaultConfigs = {
  main: {
    requestInterval: 15000,
    maxBlockRangePerRequest: 4999,
    loggerEnabled: true,
    apiPort: 8082
  },
  network: {
    mainnet: {
      name: "mainnet",
      provider: "mainnet",
      chainId: 1,
      ensResolverAddress: "0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41"
    },
    ropsten: {
      name: "ropsten",
      provider: "ropsten",
      chainId: 3,
      ensResolverAddress: "0x42D63ae25990889E35F215bC95884039Ba354115"
    },
    rinkeby: {
      name: "rinkeby",
      provider: "rinkeby",
      chainId: 4,
      ensResolverAddress: "0xf6305c19e814d2a75429Fd637d01F7ee0E77d615"
    }
  }
};
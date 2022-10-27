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
      fastSync: {
        domain: "mainnet.ens-contenthash-indexer.fast-sync.eth",
        network: "rinkeby"
      },
    },
    goerli: {
      name: "goerli",
      provider: "goerli",
      chainId: 5,
      ensResolverAddress: "0x4B1488B7a6B320d2D721406204aBc3eeAa9AD329",
      fastSync: {
        domain: "goerli.ens-contenthash-indexer.fast-sync.eth",
        network: "rinkeby"
      },
    }
  }
};
export type Config = {
    network: {
        name: string;
        provider: string;
        chainId: number;
        ensResolverAddress: string;
        resolverType: string;
        fastSync?: {
            domain: string;
            network: string;
        };
    },
    ipfs: {
        provider: string,
    },
    requestInterval: number;
    maxBlockRangePerRequest: number;
    loggerEnabled: boolean;
    apiPort: number;
};
import { IPFSIndexConfig } from "../types/IPFSIndexConfig";

export type Config = {
    adminRpcApiPort: number,
    timeouts: {
        objectGetTimeout: number,
        pinTimeout: number,
        unpinTimeout: number,
        gatewayTimeout: number
    },
    ipfs: {
        provider: string,
        gateway: string,
    },
    loggerEnabled: true,
    indexes: IPFSIndexConfig[]
};
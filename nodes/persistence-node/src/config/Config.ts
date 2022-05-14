import { IPFSIndexConfig } from "../types/IPFSIndexConfig";

export type Config = {
    apiPort: number,
    gateway: {
        port: 8081,
        requestTimeout: 5000,
        ipfsTimeout: 10
    },
    ipfs: {
        provider: string,
        gateway: string,
        timeouts: {
            objectGetTimeout: number,
            pinTimeout: number,
            unpinTimeout: number,
            gatewayTimeout: number
        }
    },
    loggerEnabled: boolean,
    indexes: IPFSIndexConfig[],
    wrapperResolution: {
        retries: {
            max: number,
            startingDelayInSec: number
        }
    }
};
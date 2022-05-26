import { IPFSIndexConfig } from "../types/IPFSIndexConfig";

export type Config = {
    apiPort: number,
    persistenceMaxParallelTaskCount: number,
    persistenceIntervalSeconds: number,
    gateway: {
        port: number,
        requestTimeout: number,
        ipfsTimeout: number
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
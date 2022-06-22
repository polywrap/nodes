import { IPFSIndexConfig } from "../types";
import { WrapperConfig } from "./WrapperConfig";

export type Config = {
    apiPort: number,
    persistenceMaxParallelTaskCount: number,
    persistenceIntervalSeconds: number,
    gateway: {
        port: number,
        requestTimeout: number,
        ipfsTimeout: number
    },
    wrapper: WrapperConfig,
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
};
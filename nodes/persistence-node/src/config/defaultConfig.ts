import { Config } from "./Config";

export const defaultConfig: Config = {
  "apiPort": 6051,
  "persistenceMaxParallelTaskCount": 10,
  "persistenceIntervalSeconds": 15,
  "gateway": {
    "port": 8081,
    "requestTimeout": 5000,
    "ipfsTimeout": 10
  },
  "wrapper": {
    "constraints": {
      "maxSize": 10_000_000,
      "maxFileSize": 10_000_000,
      "maxModuleSize": 10_000_000,
      "maxNumberOfFiles": 1000,
    },
    "resolution": {
      "retries": {
        "max": 10,
        "startingDelayInSec": 300
      }
    }
  },
  "ipfs": {
    "provider": "http://localhost:5001",
    "gateway": "https://ipfs.io/ipfs",
    "timeouts": {
      "objectGetTimeout": 15000,
      "pinTimeout": 30000,
      "unpinTimeout": 30000,
      "gatewayTimeout": 15000
    }
  },
  "loggerEnabled": true,
  "indexes": [
      {
          "name": "ens-ropsten",
          "provider": "http://localhost:8082"
      },
      {
          "name": "ens-rinkeby",
          "provider": "http://localhost:8083"
      },
      {
          "name": "ens-mainnet",
          "provider": "http://localhost:8084"
      }
  ]
};
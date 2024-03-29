import { Config } from "./Config";

export const defaultConfig: Config = {
  "apiPort": 6051,
  "persistenceMaxParallelTaskCount": 10,
  "persistenceIntervalSeconds": 15,
  "gateway": {
    "port": 8081,
    "requestTimeout": 8000,
    "ipfsTimeout": 500
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
        "max": 8,
        "startingDelayInSec": 300
      }
    }
  },
  "ipfs": {
    "provider": "http://localhost:5001",
    "gateways": ["https://ipfs.io"],
    "timeouts": {
      "gatewayTimeout": 25000,
      "pinTimeout": 30000,
      "unpinTimeout": 30000
    },
    "apis": []
  },
  "loggerEnabled": true,
  "indexes": [
    {
      "name": "ens-mainnet",
      "provider": "http://localhost:8082"
    },
    {
      "name": "ens-goerli",
      "provider": "http://localhost:8085"
    }
  ],
  "ensTextRecordIndexes": [
    {
      "name": "ensTextRecord-mainnet",
      "provider": "http://localhost:8086"
    },
    {
      "name": "ensTextRecord-goerli",
      "provider": "http://localhost:8087"
    },
  ]
};
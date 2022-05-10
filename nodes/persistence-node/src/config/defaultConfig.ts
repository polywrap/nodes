import { Config } from "./Config";

export const defaultConfig: Config = {
  "apiPort": 6051,
  "gatewayPort": 8081,
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
          "provider": "http://localhost:8082/api/ipfs/ls"
      },
      {
          "name": "ens-rinkeby",
          "provider": "http://localhost:8083/api/ipfs/ls"
      },
      {
          "name": "ens-mainnet",
          "provider": "http://localhost:8084/api/ipfs/ls"
      }
  ],
  "wrapperResolution": {
    "retries": {
        "max": 10,
        "startingDelayInSec": 300
    }
  }
};
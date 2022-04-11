import { Config } from "./Config";

export const defaultConfig: Config = {
  "adminRpcApiPort": 6051,
  "timeouts": {
      "objectGetTimeout": 15000,
      "pinTimeout": 30000,
      "unpinTimeout": 30000,
      "gatewayTimeout": 15000
  },
  "ipfs": {
      "provider": "http://localhost:5001",
      "gateway": "https://ipfs.io/ipfs"
  },
  "loggerEnabled": true,
  "indexes": [
      {
          "name": "ens-ropsten",
          "provider": "http://localhost:8083/api/ipfs/ls"
      },
      {
          "name": "ens-rinkeby",
          "provider": "http://localhost:8082/api/ipfs/ls"
      }
  ]
};
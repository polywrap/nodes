import config from "./config.json";

export class EthersConfig {
  providerNetwork = config.ensIndexer.networks[0].provider ?? "http://localhost:8545";
}
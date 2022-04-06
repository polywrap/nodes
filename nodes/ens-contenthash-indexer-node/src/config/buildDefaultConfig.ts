import { Config } from "./Config";
import { defaultConfigs } from "./defaultConfigs";

export const buildDefaultConfig = (networkName: string = "mainnet"): Config => {
  switch (networkName) {
    case "mainnet":
      return {
          network: defaultConfigs.network.mainnet,
          ...defaultConfigs.main
      };
    case "rinkeby":
      return {
          network: defaultConfigs.network.rinkeby,
          ...defaultConfigs.main
      };
    case "ropsten":
      return {
          network: defaultConfigs.network.ropsten,
          ...defaultConfigs.main
      };
    default:
      return {
          network: defaultConfigs.network.mainnet,
          ...defaultConfigs.main
      };
  }
};
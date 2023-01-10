import { Config } from "./Config";
import { defaultConfigs } from "./defaultConfigs";

export const buildDefaultConfig = (networkName: string = "mainnet"): Config => {
  switch (networkName) {
    case "mainnet":
      return {
          network: defaultConfigs.network.mainnet,
          ...defaultConfigs.main
      };
    case "goerli":
      return {
          network: defaultConfigs.network.goerli,
          ...defaultConfigs.main
      };
    default:
      return {
          network: defaultConfigs.network.mainnet,
          ...defaultConfigs.main
      };
  }
};
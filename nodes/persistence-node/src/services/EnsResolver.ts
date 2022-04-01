import { Contract, ethers, providers } from "ethers";
import { EnsNetworkConfig } from "../config/EnsConfig";

export class EnsResolver {

  public readonly contract: Contract;
  public readonly ethersProvider: providers.BaseProvider;
  
  constructor (
    private networkConfig: EnsNetworkConfig,
  ) {
    this.ethersProvider = ethers.providers.getDefaultProvider(
      networkConfig.provider
    );

    this.contract = new ethers.Contract(
      networkConfig.ResolverAddr, 
      networkConfig.ResolverAbi, 
      this.ethersProvider
    );
  }

  public getProviderAddress = () => this.networkConfig.provider;

}
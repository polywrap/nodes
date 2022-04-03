import { Contract, ethers, providers } from "ethers";
import { EnsNetworkConfig } from "../config/EnsConfig";

export class EthereumNetwork {

  public readonly ensPublicResolver: Contract;
  public readonly ethersProvider: providers.BaseProvider;
  
  constructor (
    private readonly networkConfig: EnsNetworkConfig,
  ) {
    this.ethersProvider = ethers.providers.getDefaultProvider(
      networkConfig.network
    );

    this.ensPublicResolver = new ethers.Contract(
      networkConfig.ResolverAddr, 
      networkConfig.ResolverAbi, 
      this.ethersProvider
    );
  }

  public getNetworkAddress = () => this.networkConfig.network;

}
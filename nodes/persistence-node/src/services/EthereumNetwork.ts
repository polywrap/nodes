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
      networkConfig.resolverAddr, 
      networkConfig.resolverAbi, 
      this.ethersProvider
    );
  }

  public get chainId(): number {
    return this.networkConfig.chainId;
  }

  public getNetworkAddress = () => this.networkConfig.network;

}
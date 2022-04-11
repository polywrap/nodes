import { Contract, ethers, providers } from "ethers";
import { EnsNetworkConfig } from "../config/EnsNetworkConfig";

interface IDependencies {
  ensNetworkConfig: EnsNetworkConfig,
}

export class EthereumNetwork {

  public readonly ensPublicResolver: Contract;
  public readonly ethersProvider: providers.BaseProvider;
  
  constructor (private readonly deps: IDependencies) {
    this.ethersProvider = ethers.providers.getDefaultProvider(
      deps.ensNetworkConfig.provider
    );

    this.ensPublicResolver = new ethers.Contract(
      deps.ensNetworkConfig.resolverAddr, 
      deps.ensNetworkConfig.resolverAbi, 
      this.ethersProvider
    );
  }

  public get chainId(): number {
    return this.deps.ensNetworkConfig.chainId;
  }

  public get name(): string {
    return this.deps.ensNetworkConfig.name;
  }
}
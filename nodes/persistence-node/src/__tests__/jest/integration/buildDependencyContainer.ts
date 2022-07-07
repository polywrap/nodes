import { AwilixContainer, createContainer, InjectionMode, NameAndRegistrationPair, asValue, asFunction } from "awilix";
import { IPFS } from "ipfs-core";
import { IpfsConfig } from "../../../config/IpfsConfig";
import { createIpfsNode } from "../../../ipfs";

type TestDependencyContainer = {
  ipfsConfig: IpfsConfig,
  ipfsNode: IPFS
};

export const buildDependencyContainer = async (
  ipfsConfig: IpfsConfig,
  extensionsAndOverrides?: NameAndRegistrationPair<unknown>
): Promise<AwilixContainer<TestDependencyContainer>> => {

  const container = createContainer<TestDependencyContainer>({
    injectionMode: InjectionMode.PROXY,
  });

  container.register({
    ipfsConfig: asValue(ipfsConfig), 
    ...extensionsAndOverrides,
  });

  const ipfsNode = await createIpfsNode(container.cradle);

  container.register({
    ipfsNode: asFunction(() => ipfsNode)
      .singleton()
  });

  return container;
};
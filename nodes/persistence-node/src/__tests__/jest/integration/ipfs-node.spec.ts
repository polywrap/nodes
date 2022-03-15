import {
  buildAndDeployApi,
  initTestEnvironment,
  stopTestEnvironment,
} from "@web3api/test-env-js";
import * as IPFS from 'ipfs-core'
import { buildMainDependencyContainer } from "../../../di/buildMainDependencyContainer";
import * as awilix from "awilix";

jest.setTimeout(30000);

describe("ipfs-node", () => {
  let ipfsProvider: string;
  let ensAddress: string;
  let ipfsNode: IPFS.IPFS;

  beforeAll(async () => {
    const { ipfs, ethereum, ensAddress: ens } = await initTestEnvironment();
    ipfsProvider = ipfs;
    ensAddress = ens;
  });

  afterAll(async () => {
    await stopTestEnvironment();
  });

  beforeEach(async () => {
    const dependencyContainer = await buildMainDependencyContainer({
      ipfsConfig: awilix
      .asFunction(({ }) => {
        return {
          ipfsProvider: ipfsProvider,
          gatewayURI: "https://ipfs.io/ipfs",
          objectGetTimeout: 5000,
          pinTimeout: 5000,
          unpinTimeout: 5000,
          gatewayTimeout: 5000
        };
      })
      .singleton()
    });
    ipfsNode = dependencyContainer.cradle.ipfsNode;
  });

  afterEach(async () => {
    await ipfsNode.stop();
  });

  it("can start an IPFS node", async () => {
    const id = await ipfsNode.id();
    
    expect(id).toBeTruthy();
  });
});

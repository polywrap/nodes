import {
  buildAndDeployApi,
  initTestEnvironment,
  stopTestEnvironment,
} from "@web3api/test-env-js";
import * as IPFS from 'ipfs-core'
import { buildDependencyContainer } from "../../../di/buildDependencyContainer";
import * as awilix from "awilix";

jest.setTimeout(360000);

describe("Sanity", () => {
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
    const dependencyContainer = await buildDependencyContainer({
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

  it("should be able to start node and get id", async () => {
    const id = await ipfsNode.id();
    console.log(id);
    
    expect(id).toBeTruthy();
  });
});

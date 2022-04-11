import { buildMainDependencyContainer } from "../../../modules/daemon/daemon.deps";
import { Express } from "express";
import supertest from "supertest";

jest.setTimeout(50000);

describe("ipfs-gateway-api", () => {
  let app: Express;

  const nonExistentHash = "QmcnrHegojMFqHkRhixazY67Zb9mSbMLv6sSxyDpUtnrQSy";
  const nonBase32Hash = "SomeInvalidHash";

  beforeAll(async () => {
    const container = await buildMainDependencyContainer();
    app = container.cradle.ipfsGatewayApi.createExpressApp();
  });

  it("cat returns 404 for unknown hash", async () => {
    await supertest(app)
      .get(`/api/v0/cat?arg=${nonExistentHash}`)
      .expect(404);
  });

  it("cat returns 404 for invalid hash", async () => {
    await supertest(app)
      .get(`/api/v0/cat?arg=${nonBase32Hash}`)
      .expect(404);
  });

  it("resolve returns 404 for unknown path", async () => {
    await supertest(app)
      .get(`/api/v0/resolve?arg=${nonExistentHash}`)
      .expect(404);
  });

  it("resolve returns 404 for invalid path", async () => {
    await supertest(app)
      .get(`/api/v0/resolve?arg=${nonBase32Hash}`)
      .expect(404);
  });

  it("ipfs returns 404 for unknown path", async () => {
    await supertest(app)
      .get(`/ipfs/${nonExistentHash}`)
      .expect(404);
  });

  it("ipfs returns 404 for invalid path", async () => {
    await supertest(app)
      .get(`/ipfs/${nonBase32Hash}`)
      .expect(404);
  });
});

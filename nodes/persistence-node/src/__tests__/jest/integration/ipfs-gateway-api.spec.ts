import { buildMainDependencyContainer } from "../../../modules/daemon/daemon.deps";
import { Express } from "express";
import supertest from "supertest";

jest.setTimeout(50000);

describe("ipfs-gateway-api", () => {
  let app: Express;

  const nonExistentHash = "QmcnrHegojMFqHkRhixazY67Zb9mSbMLv6sSxyDpUtnrQSy";
  const nonBase32Hash = "SomeInvalidHash";
  const genericErrorResponseMessage = "Something went wrong. Check the logs for more info.";

  beforeAll(async () => {
    const container = await buildMainDependencyContainer();
    app = container.cradle.ipfsGatewayApi.createExpressApp();
  });

  it("cat returns 500 with message for unknown hash", async () => {
    await supertest(app)
      .get(`/api/v0/cat?arg=${nonExistentHash}`)
      .expect(500)
      .then(response => {
        expect(response.body).not.toBe(genericErrorResponseMessage);
      });
  });

  it("cat returns 500 with message for invalid hash", async () => {
    await supertest(app)
      .get(`/api/v0/cat?arg=${nonBase32Hash}`)
      .expect(500)
      .then(response => {
        expect(response.body).not.toBe(genericErrorResponseMessage);
      });
  });

  it("resolve returns 500 with message for unknown path", async () => {
    await supertest(app)
      .get(`/api/v0/resolve?arg=${nonExistentHash}`)
      .expect(500)
      .then(response => {
        expect(response.body).not.toBe(genericErrorResponseMessage);
      });
  });

  it("resolve returns 500 with message for invalid path", async () => {
    await supertest(app)
      .get(`/api/v0/resolve?arg=${nonBase32Hash}`)
      .expect(500)
      .then(response => {
        expect(response.body).not.toBe(genericErrorResponseMessage);
      });
  });

  it("ipfs returns 500 with message for unknown path", async () => {
    await supertest(app)
      .get(`/ipfs/${nonExistentHash}`)
      .expect(500)
      .then(response => {
        expect(response.body).not.toBe(genericErrorResponseMessage);
      });
  });

  it("ipfs returns 500 with message for invalid path", async () => {
    await supertest(app)
      .get(`/ipfs/${nonBase32Hash}`)
      .expect(500)
      .then(response => {
        expect(response.body).not.toBe(genericErrorResponseMessage);
      });
  });
});

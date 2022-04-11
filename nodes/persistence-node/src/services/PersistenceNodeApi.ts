import express, { NextFunction, Request, Response } from "express";
import http from "http";
import { handleError } from "../api-server/handleError";
import { MainDependencyContainer } from "../modules/daemon/daemon.deps";

export class PersistenceNodeApi {
  constructor(
    private deps: MainDependencyContainer
  ) { }

  async run() {
    const app = express();

    app.get('/api/info', handleError(async (req, res) => {

      //TODO:
      res.status(200).send({});
    }));

    const server = http.createServer({}, app);
    const port = this.deps.persistenceNodeApiConfig.adminRpcApiPort;

    server.listen(port, () => {
      this.deps.logger.log(`Internal HTTP server started at http://localhost:${port}`);
    });
  }
}
import express, { NextFunction, Request, Response } from "express";
import http from "http";
import { MainDependencyContainer } from "../modules/daemon/daemon.deps";

export class PersistenceNodeApi {
  constructor(
    private deps: MainDependencyContainer
  ) { }

  async run() {
    const app = express();

    app.get('/api/reset', handleError(async (req, res) => {

      await this.deps.storage.reset();

      res.send(`Task 'reset' successfully executed.`)
    }));

    app.get('/api/info', handleError(async (req, res) => {

      const info = this.deps.storage.getStats();

      res.send(info);
    }));

    const server = http.createServer({}, app);
    const port = this.deps.persistenceNodeApiConfig.port;

    server.listen(port, function () {
      console.log(`Internal HTTP server started at http://localhost:${port}`);
    });
  }
}

function handleError(callback: (req: Request<{}>, res: Response, next: NextFunction) => Promise<void>) {
  return function (req: Request<{}>, res: Response, next: NextFunction) {
    callback(req, res, next)
      .catch(next)
  }
}
import express, { NextFunction, Request, Response } from "express";
import http from "http";
import { MainDependencyContainer } from "../modules/daemon/daemon.deps";

export class PersistenceNodeApi {
  constructor(
    private deps: MainDependencyContainer
  ) { }

  async run() {
    const app = express();

    app.get('/api/past', handleError(async (req, res) => {
      const blocks = req.query.blocks;

      if (!blocks) {
        res.status(422).send("Blocks parameter missing.");
        return;
      }

      await this.deps.cacheRunner.runForPastBlocks(Number(blocks));

      res.send(`Task 'past' successfully executed.`)
    }));

    app.get('/api/unresponsive', handleError(async (req, res) => {

      await this.deps.cacheRunner.processUnresponsive();

      res.send(`Task 'unresponsive' successfully executed.`)
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
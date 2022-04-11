import express, { NextFunction, Request, Response } from "express";
import { EnsIndexerConfig } from "../config/EnsIndexerConfig";
import { EnsStateManager } from "./EnsStateManager";
import { Logger } from "./Logger";

interface IDependencies {
  ensIndexerConfig: EnsIndexerConfig,
  ensStateManager: EnsStateManager,
  logger: Logger
}

export class APIServer {
  constructor(private readonly deps: IDependencies) {
  }

  async run(port: number) {
    port = !!port
      ? port
      : this.deps.ensIndexerConfig.apiPort;

    const app = express();

    app.all('*', handleError(async (req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

      //Trim and redirect multiple slashes in URL
      if (req.url.match(/[/]{2,}/g)) {
        req.url = req.url.replace(/[/]+/g, '/');
        res.redirect(req.url);
        return;
      }

      if (req.method === 'OPTIONS') {
        res.send(200);
      } else {
        this.deps.logger.log("Request: " + req.method + " " + req.url);
        next();
      }
    }));

    app.get('/api/contenthash/ls', handleError(async (req, res) => {
      res.json(this.deps.ensStateManager.getContenthashes());
    }));

    app.get('/api/ipfs/ls', handleError(async (req, res) => {
      res.json(this.deps.ensStateManager.getIpfsCIDs());
    }));

    app.get("/", handleError(async (req, res) => {
      res.send("Status: running");
    }));

    app.get("/status", handleError(async (req, res) => {
      res.json({
        status: "running"
      });
    }));

    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      res.status(500).send("Something went wrong. Check the logs for more info.");
      this.deps.logger.log(err.message);
    });

    app.listen(port);
  }
}

function handleError(callback: (req: Request<{}>, res: Response, next: NextFunction) => Promise<void>) {
  return function (req: Request<{}>, res: Response, next: NextFunction) {
    callback(req, res, next)
      .catch(next)
  }
}
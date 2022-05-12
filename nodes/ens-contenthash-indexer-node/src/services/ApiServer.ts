import express, { NextFunction, Request, Response } from "express";
import { EnsIndexerConfig } from "../config/EnsIndexerConfig";
import { EnsStateManager } from "./EnsStateManager";
import { Logger } from "./Logger";
import { runServer } from "../http-server/runServer";
import { IPFS } from "ipfs-core";

interface IDependencies {
  apiPort: number;
  ensIndexerConfig: EnsIndexerConfig,
  ensStateManager: EnsStateManager,
  logger: Logger;
  ipfsNode: IPFS;
}

export class ApiServer {
  constructor(private readonly deps: IDependencies) {
  }

  async run() {
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

    app.post('/api/fast-sync/upload', handleError(async (req, res) => {
      const syncState = this.deps.ensStateManager.getState();

      const resp = await this.deps.ipfsNode.add(JSON.stringify(syncState));

      res.json(resp.cid.toString());
    }));

    app.get("/", handleError(async (req, res) => {
      res.send("Status: running");
    }));

    app.get("/status", handleError(async (req, res) => {
      res.json({
        status: "running"
      });
    }));

    runServer(
      app,
      this.deps.apiPort, 
      this.deps.logger,
      () => console.log(`API listening on http://localhost:${this.deps.apiPort}`)
    );
  }
}

function handleError(callback: (req: Request<{}>, res: Response, next: NextFunction) => Promise<void>) {
  return function (req: Request<{}>, res: Response, next: NextFunction) {
    callback(req, res, next)
      .catch(next)
  }
}
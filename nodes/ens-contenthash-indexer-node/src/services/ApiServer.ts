import express, { NextFunction, Request, Response, Express } from "express";
import { EnsIndexerConfig } from "../config/EnsIndexerConfig";
import { EnsStateManager } from "./EnsStateManager";
import { Logger } from "./Logger";
import { runServer } from "../http-server/runServer";
import { IPFS } from "ipfs-core";
import http from "http";
import { EthereumNetwork } from "./EthereumNetwork";
import { NodeStateManager } from "./NodeStateManager";
import { toPrettyNumber } from "../utils/toPrettyNumber";

interface IDependencies {
  apiPort: number;
  ensIndexerConfig: EnsIndexerConfig,
  ensStateManager: EnsStateManager,
  nodeStateManager: NodeStateManager,
  logger: Logger;
  ipfsNode: IPFS;
  ethereumNetwork: EthereumNetwork;
}

export class ApiServer {
  isRunning: boolean = false;
  expressServer?: http.Server;
  
  constructor(private readonly deps: IDependencies) {
  }

  async tryStart(): Promise<void> {
    if(this.isRunning) {
      return;
    }

    await this.start();
  }

  async tryStop(): Promise<void> {
    if(!this.isRunning) {
      return;
    }

    await this.stop();
  }

  async start(): Promise<void> {
    this.deps.logger.log(`Starting API server...`);
   
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
      if (this.deps.ensStateManager.getState().isFullySynced) {
        res.json(this.deps.ensStateManager.getIpfsCIDs());  
      } else {
        res.status(400).send({
          error: 'ENS indexer is not fully synced'
        });
      }
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
      const syncState = this.deps.ensStateManager.getState();

      res.json({
        name: this.deps.ethereumNetwork.name,
        online: true,
        latestBlock: toPrettyNumber(this.deps.ethereumNetwork.ethersProvider.blockNumber),
        lastBlockProcessed: toPrettyNumber(this.deps.ensStateManager.state.lastBlockNumberProcessed),
        lastBlockIndexed: toPrettyNumber(syncState.lastBlockNumber - 1),
        blocksToProcess: toPrettyNumber(this.deps.ethereumNetwork.ethersProvider.blockNumber - this.deps.ensStateManager.state.lastBlockNumberProcessed),
        blocksToIndex: toPrettyNumber(this.deps.ethereumNetwork.ethersProvider.blockNumber - syncState.lastBlockNumber + 1),
        domainsIndexed: toPrettyNumber(Object.keys(this.deps.ensStateManager.state.ensContenthash).length),
        contenthashesIndexed: toPrettyNumber(Object.keys(this.deps.ensStateManager.state.contenthashEns).length),
        ipfsHashesIndexed: toPrettyNumber(this.deps.ensStateManager.getIpfsCIDs().length),
        lastFastSyncHash: this.deps.nodeStateManager.state.fastSync.lastIpfsHash,
        isFullySynced: this.deps.ensStateManager.state.isFullySynced,
        });
    }));

    this.expressServer = runServer(
      app,
      this.deps.apiPort, 
      this.deps.logger,
      () => this.deps.logger.log(`API listening on http://localhost:${this.deps.apiPort}`)
    );
    this.isRunning = true;
  }

  stop() {
    this.deps.logger.log(`Stopping API server...`);
  
    if(!this.isRunning) {
      this.deps.logger.log(`Could not stop API server, it is not running`);
      return;
    }

    if(!this.expressServer) {
      this.deps.logger.log(`Could not stop API server, express server is not initialized`);
      return;
    }
    this.expressServer.close();
    this.isRunning = false;
    this.expressServer = undefined;
    this.deps.logger.log(`API server no longer listening on http://localhost:${this.deps.apiPort}`);
  }
}

function handleError(callback: (req: Request<{}>, res: Response, next: NextFunction) => Promise<void>) {
  return function (req: Request<{}>, res: Response, next: NextFunction) {
    callback(req, res, next)
      .catch(next)
  }
}
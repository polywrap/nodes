import { ethers } from "ethers";
import express, { NextFunction, Request, Response } from "express";
import http from "http";
import * as IPFS from 'ipfs-core';
import { InternalApiConfig } from "../config/InternalApiConfig";
import { IpfsConfig } from "../config/IpfsConfig";
import { Storage } from "../types/Storage";
import { CacheRunner } from "./CacheRunner";
import { Logger } from "./Logger";

interface IDependencies {
  ethersProvider: ethers.providers.Provider;
  ensPublicResolver: ethers.Contract;
  storage: Storage;
  cacheRunner: CacheRunner;
  ipfsNode: IPFS.IPFS;
  ipfsConfig: IpfsConfig;
  internalApiConfig: InternalApiConfig;
  logger: Logger;
}

export class PersistenceNodeApi {
  deps: IDependencies;

  constructor(deps: IDependencies) {
    this.deps = deps;
  }

  async run() {
    const app = express();

    app.get('/api/v0/past', handleError(async (req, res) => {
      const blocks = req.query.blocks;

      if (!blocks) {
        res.status(422).send("Blocks parameter missing.");
        return;
      }

      var head = {
        'Content-Type': 'text/html; charset=UTF-8',
        'transfer-encoding': 'chunked'
      }

      res.writeHead(206, head)

      this.deps.logger.registerListener(log => {
        console.log('LISTENER TRIGERED')
        res.write(log)
      })

      await this.deps.cacheRunner.runForPastBlocks(Number(blocks));

      this.deps.logger.unregisterListener();
      res.end()
    }));

    const server = http.createServer({}, app);
    const port = this.deps.internalApiConfig.port;
    
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
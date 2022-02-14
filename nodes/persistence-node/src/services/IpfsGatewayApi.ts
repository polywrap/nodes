import { ethers } from "ethers";
import * as IPFS from 'ipfs-core';
import express from "express";
import multer, { memoryStorage } from "multer";
import { IpfsConfig } from "../config/IpfsConfig";
import { MulterFile } from "../MulterFile";
import { Storage } from "../types/Storage";
import { HttpConfig } from "../api-server/HttpConfig";
import { HttpsConfig } from "../api-server/HttpsConfig";
import { runServer } from "../api-server/runServer";
import { addFilesAsDirToIpfs } from "../ipfs-operations/addFilesAsDirToIpfs";
import { Logger } from "./Logger";

interface IDependencies {
  ethersProvider: ethers.providers.Provider;
  ensPublicResolver: ethers.Contract;
  storage: Storage;
  ipfsNode: IPFS.IPFS;
  ipfsConfig: IpfsConfig;
  logger: Logger;
}

export class IpfsGatewayApi {
  deps: IDependencies;

  constructor(deps: IDependencies) {
    this.deps = deps;
  }

  async run(
    httpConfig: HttpConfig,
    httpsConfig: HttpsConfig
  ) {
    const ipfs = this.deps.ipfsNode;
 
    const app = express();

    const upload = multer({ 
      storage: memoryStorage(),
      limits: {
        fileSize: 1*1024*1024,
        files: 7
      }
    });

    app.all('*', (req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

      //Trim and redirect multiple slashes in URL
      if(req.url.match(/[/]{2,}/g)) {
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
    });

    app.get('/api/v0/cat', async (req, res) => {
      const hash = req.query.arg as string;

      const stream = ipfs.cat(hash); 

      let data: Uint8Array = new Uint8Array();
      
      for await (const chunk of stream) {
        const temp = new Uint8Array(data.length + chunk.length);
        temp.set(data);
        temp.set(chunk, data.length);
        data = temp;
      }

      const buffer = Buffer.from(data);

      res.send(buffer);
    });

    app.get('/api/v0/resolve', async (req, res) => {
      const hash = req.query.arg as string;

      const resolvedPath = await ipfs.resolve(`/ipfs/${hash}`); 

      res.json({
        path: resolvedPath
      });
    });

    app.post('/add', upload.fields([ { name: "files"}, { name: "options", maxCount: 1 } ]), async (req, res) => {
      if(!req.files) {
        res.json({
          error: "No files were uploaded"
        });
      }

      const options = req.body.options 
        ? JSON.parse(req.body.options)
        : {
          onlyHash: false,
        };
      
      const files: {files: MulterFile[]} = req.files as {files: MulterFile[]};

      const cid = await addFilesAsDirToIpfs(
        files.files.map(x => ({
          path: x.originalname,
          content: x.buffer
        })),
        { onlyHash: options.onlyHash },
        ipfs
      );

      this.deps.logger.log(`Gateway add: ${cid}`);
      
      res.json({
        cid,
      });
    });

    app.get("/", async (req, res) => {
      res.send("Status: running");
    });

    app.get("/status", async (req, res) => {
      res.json({
        status: "running"
      });
    });

    runServer(httpConfig, httpsConfig, app);
  }
}

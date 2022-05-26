import express, { NextFunction, Request, Response } from "express";
import multer, { memoryStorage } from "multer";
import { addFilesToIpfs } from "../../ipfs-operations/addFilesToIpfs";
import mustacheExpress from "mustache-express";
import path from "path";
import { addFilesAsDirToIpfs } from "../../ipfs-operations/addFilesAsDirToIpfs";
import { MulterFile } from "../../MulterFile";
import { asyncIterableToArray } from "../../utils/asyncIterableToArray";
import { formatFileSize } from "../../utils/formatFileSize";
import { getIpfsFileContents } from "../../getIpfsFileContents";
import { handleError } from "../../http-server/handleError";
import { VERSION } from "../../constants/version";
import { IpfsAddResult } from "../../types/IpfsAddResult";
import { isValidWrapperManifestName } from "../../isValidWrapperManifestName";
import { IpfsErrorResponse } from "../../types/IpfsErrorResponse";
import cors from "cors";
import http from "http";
import { WRAPPER_DEFAULT_NAME } from "../../constants/wrappers";
import timeout from "connect-timeout";
import * as IPFS from 'ipfs-core';
import { WrapperWithFileList } from "./models/WrapperWithFileList";
import { GatewayConfig } from "../../config/GatewayConfig";
import { PersistenceStateManager } from "../PersistenceStateManager";
import { Logger } from "../Logger";

interface IDependencies {
  persistenceStateManager: PersistenceStateManager;
  ipfsNode: IPFS.IPFS;
  gatewayConfig: GatewayConfig;
  logger: Logger;
}

export class GatewayServer {
  deps: IDependencies;

  constructor(deps: IDependencies) {
    this.deps = deps;
  }

  async run() {
    const ipfs = this.deps.ipfsNode;

    const app = express();
    app.use(timeout(this.deps.gatewayConfig.requestTimeout));

    app.engine('html', mustacheExpress());
    app.set('view engine', 'html');
    app.set('views', path.join(__dirname, '../../ui'));

    const upload = multer({
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024,
        files: 50
      }
    });

    app.all('*', handleError(async (req: Request, res: Response, next: NextFunction) => {
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
        this.deps.logger.log(`Request:  ${req.method} --- ${req.url}`);
        next();
      }
    }));

    app.use((req: Request, res: Response, next: NextFunction) => {
      res.on('finish', () => {
        this.deps.logger.log(`Response: ${req.method} ${res.statusCode} ${req.url}`);
      });
      next();
    });

    app.use(cors({
      origin: "*",
    }));

    app.get('/api/v0/cat', handleError(async (req, res) => {
      const controller = new AbortController();

      req.on('close', () => {
        controller.abort();
      });

      const hash = req.query.arg as string;

      if (!hash) {
        res.status(422).send("Hash parameter missing.");
        return;
      }

      const fileContents = await getIpfsFileContents(ipfs, hash, controller.signal, this.deps.gatewayConfig.ipfsTimeout);

      res.send(fileContents);
    }));

    app.get('/api/v0/resolve', handleError(async (req, res) => {
      const controller = new AbortController();

      req.on('close', () => {
        controller.abort();
      });
      
      const hash = req.query.arg as string;

      const resolvedPath = await ipfs.resolve(`/ipfs/${hash}`, {
        signal: controller.signal,
        timeout: this.deps.gatewayConfig.ipfsTimeout
      });

      res.json({
        path: resolvedPath
      });
    }));

    app.get('/pin/ls', handleError(async (req, res) => {
      let pinnedIpfsHashes: string[] = [];

      for (const info of this.deps.persistenceStateManager.getTrackedIpfsHashInfos()) {
        if (!info.isPinned) {
          continue;
        }

        pinnedIpfsHashes.push(info.ipfsHash);
      }

      res.render('ipfs-pinned-files', {
        pinned: pinnedIpfsHashes,
        count: pinnedIpfsHashes.length,
      })
    }));

    app.get('/pins', handleError(async (req, res) => {
      const controller = new AbortController();

      req.on('close', () => {
        controller.abort();
      });

      const infos = this.deps.persistenceStateManager.getTrackedIpfsHashInfos()
        .filter(x => x.isPinned)
        .reverse();

      const wrapperSizes = await Promise.all(infos.map(async info => {
        const statResult = await ipfs.files.stat(`/ipfs/${info.ipfsHash}`, {
          signal: controller.signal,
          timeout: this.deps.gatewayConfig.ipfsTimeout
        });

        return formatFileSize(statResult.cumulativeSize);
      }));

      const pinnedWrappers = (
        await Promise.all(infos.map(async (info, index) => {
          const object = await ipfs.object.get(IPFS.CID.parse(info.ipfsHash), {
            signal: controller.signal,
            timeout: this.deps.gatewayConfig.ipfsTimeout
          });

          const wrapper = {
            cid: info.ipfsHash,
            files: object.Links
              .filter(x => x.Name)
              .map(x => {
                return {
                  name: x.Name as string,
                  cid: x.Hash.toString()
                };
              })
          } as WrapperWithFileList;

          const wrapperSize = wrapperSizes[index];

          const manifestFile = wrapper.files.find(x => isValidWrapperManifestName(x.name));
          const schemaFile = wrapper.files.find(x => x.name === "schema.graphql");
    
          if(!manifestFile) {
            return undefined;
          }
    
          if(!schemaFile) {
            return undefined;
          }
    
          if(manifestFile?.name === "web3api.json") {
            const fileContents = await getIpfsFileContents(
              ipfs, 
              manifestFile.cid, 
              controller.signal, 
              this.deps.gatewayConfig.ipfsTimeout
            );
            const manifest = fileContents.toString();
            const parsed = JSON.parse(manifest);
    
            if(parsed.name) {
              return {
                cid: wrapper.cid,
                name: parsed.name,
                manifest: {
                  cid: manifestFile.cid,
                  name: manifestFile.name,
                },
                schema: {
                  cid: schemaFile.cid,
                  name: schemaFile.name,
                },
                size: wrapperSize,
              };
            } 
          }
    
          return {
            cid: infos[index].ipfsHash,
            name: WRAPPER_DEFAULT_NAME,
            manifest: {
              cid: manifestFile.cid,
              name: manifestFile.name,
            },
            schema: {
              cid: schemaFile.cid,
              name: schemaFile.name,
            },
            size: wrapperSize,
          };
        }))
      ).filter(x => !!x);

      res.render('pins', {
        wrappers: pinnedWrappers,
        count: pinnedWrappers.length,
      });
    }));

    app.get("/ipfs/:path(*)", handleError(async (req, res) => {
      const ipfsPath = (req.params as any).path as string;
      const controller = new AbortController();

      req.on('close', () => {
        controller.abort();
      });

      const contentDescription = await ipfs.files.stat(`/ipfs/${ipfsPath}`, {
        signal: controller.signal,
        timeout: this.deps.gatewayConfig.ipfsTimeout
      });

      if (contentDescription.type === "file") {
        const fileContent = await getIpfsFileContents(ipfs, ipfsPath, controller.signal, this.deps.gatewayConfig.ipfsTimeout);
        res.end(fileContent);
      } else if (contentDescription.type === "directory") {
        const object = await ipfs.object.get(IPFS.CID.parse(ipfsPath), {
          signal: controller.signal,
          timeout: this.deps.gatewayConfig.ipfsTimeout
        });

        const stats = await Promise.all(
          object.Links.map(
            x => ipfs.files.stat(`/ipfs/${x.Hash.toString()}`)
          )
        );
        
        const items = object.Links.map((x, index) => ({
          name: x.Name,
          cid: x.Hash.toString(),
          sizeInKb: stats[index].type === "file"
            ? formatFileSize(stats[index].size)
            : formatFileSize(stats[index].cumulativeSize)
        }));

        return res.render("ipfs-directory-contents", {
          items,
          path: ipfsPath,
          totalSizeInKb: formatFileSize(contentDescription.cumulativeSize)
        });
      } else {
        res.status(500).json(this.buildIpfsError("Unsupported file type"));
      }
    }));

    app.post('/add', upload.fields([{ name: "files" }, { name: "options", maxCount: 1 }]), handleError(async (req, res) => {
      if (!req.files) {
        res.status(500).json(this.buildIpfsError("No files were uploaded"));
        return;
      }

      const options = req.body.options
        ? JSON.parse(req.body.options)
        : {
          onlyHash: false,
        };

      const files: { files: MulterFile[] } = req.files as { files: MulterFile[] };

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
    }));

    app.post('/api/v0/add', upload.any(), handleError(async (req, res) => {
      if (!req.files) {
        res.status(500).json(this.buildIpfsError("No files were uploaded"));
        return;
      }

      const files: MulterFile[] = req.files as MulterFile[];

      let hasWrapManifest = false;

      const filesToAdd = files.map(x => {
        const pathToFile = decodeURIComponent(x.originalname);

        if(isValidWrapperManifestName(path.basename(pathToFile))) {
          hasWrapManifest = true;
        }

        //If the file is a directory, we don't add the buffer, otherwise we get a different CID than expected
        if(x.mimetype === "application/x-directory") {
          return {
            path: pathToFile,
          };
        } else {
          return {
            path: pathToFile,
            content: x.buffer,
          };
        }
      });

      if(!hasWrapManifest) {
        res.status(500).json(this.buildIpfsError("No valid wrapper manifest found in upload"));
        return;
      }

      const addedFiles = await addFilesToIpfs(
        filesToAdd,
        { onlyHash: !!req.query["only-hash"] },
        ipfs
      );

      const rootCID = addedFiles.filter((x: IpfsAddResult) => x.path.indexOf("/") === -1)[0].cid;

      this.deps.logger.log(`Gateway add: ${rootCID}`);

      res.writeHead(200, {
        'Content-Type': 'application/json',
      });
   
      for(const file of addedFiles) {
        res.write(JSON.stringify({
          Name: file.path,
          Hash: file.cid.toString(),
          Size: file.size,
        }) + "\n");
      }

      res.end();
    }));

    app.get("/", handleError(async (req, res) => {
      res.send(`Status: running<br>Version: ${VERSION}`);
    }));

    app.get("/status", handleError(async (req, res) => {
      res.json({
        status: "running"
      });
    }));
    
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      res.status(500).json(this.buildIpfsError(err.message));
      this.deps.logger.log(err.message);
    });

    const server = http.createServer({}, app);
  
    server.listen(this.deps.gatewayConfig.port, () => console.log(`Gateway listening on http://localhost:${this.deps.gatewayConfig.port}`));
  }

  buildIpfsError(message: string): IpfsErrorResponse {
    this.deps.logger.log("Gateway error: " + message);
  
    return {
      Message: message,
      Type: "error"
    };
  }
}
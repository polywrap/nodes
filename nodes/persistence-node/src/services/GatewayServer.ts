import express, { NextFunction, Request, Response } from "express";
import multer, { memoryStorage } from "multer";
import { addFilesToIpfs } from "../ipfs-operations/addFilesToIpfs";
import mustacheExpress from "mustache-express";
import path from "path";
import { runServer } from "../http-server/runServer";
import { addFilesAsDirToIpfs } from "../ipfs-operations/addFilesAsDirToIpfs";
import { MainDependencyContainer } from "../modules/daemon/daemon.deps";
import { MulterFile } from "../MulterFile";
import { asyncIterableToArray } from "../utils/asyncIterableToArray";
import { formatFileSize } from "../utils/formatFileSize";
import { getIpfsFileContents } from "../getIpfsFileContents";
import { handleError } from "../http-server/handleError";
import { VERSION } from "../constants/version";
import { IpfsAddResult } from "../types/IpfsAddResult";
import { isValidWrapperManifestName } from "../isValidWrapperManifestName";
import { IpfsErrorResponse } from "../types/IpfsErrorResponse";
import cors from "cors";
import http from "http";
import { WRAPPER_DEFAULT_NAME } from "../constants/wrappers";
import timeout from "connect-timeout";

export class GatewayServer {
  deps: MainDependencyContainer;

  constructor(deps: MainDependencyContainer) {
    this.deps = deps;
  }

  async run() {
    const ipfs = this.deps.ipfsNode;

    const app = express();
    app.use(timeout(this.deps.gatewayConfig.requestTimeout));

    app.engine('html', mustacheExpress());
    app.set('view engine', 'html');
    app.set('views', path.join(__dirname, '../ui'));

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

      let wrappers: ({ 
        cid: string, 
        name: string,
        manifest: {
          cid: string,
          name: string,
        },
        schema: {
          cid: string,
          name: string,
        },
        size: string,
      } | undefined)[] = [];


      const infos = this.deps.persistenceStateManager.getTrackedIpfsHashInfos().filter(x => x.isPinned);
      const wrapperSizes = await Promise.all(infos.map(async info => {
        const statResult = await ipfs.files.stat(`/ipfs/${info.ipfsHash}`, {
          signal: controller.signal,
          timeout: this.deps.gatewayConfig.ipfsTimeout
        });

        const wrapperSize = formatFileSize(statResult.cumulativeSize);
        return wrapperSize;
      }));
  
      const itemLists = await Promise.all(infos.map(async info => {
        return asyncIterableToArray(
          ipfs.ls(info.ipfsHash, {
            signal: controller.signal,
            timeout: this.deps.gatewayConfig.ipfsTimeout
          })
        );
      }));

      wrappers = await Promise.all(itemLists.map(async (items, index) => {
        const info = infos[index];
        const wrapperSize = wrapperSizes[index];

        const manifestFile = items.find(x => isValidWrapperManifestName(x.name));
        const schemaFile = items.find(x => x.name === "schema.graphql");
  
        if(!manifestFile) {
          this.deps.logger.log(`No manifest file found for pinned wrapper ${info.ipfsHash}, this should not happen.`);
          return undefined;
        }
  
        if(!schemaFile) {
          this.deps.logger.log(`No schema file found for pinned wrapper ${info.ipfsHash}, this should not happen.`);
          return undefined;
        }
  
        if(manifestFile?.name === "web3api.json") {
          const fileContents = await getIpfsFileContents(ipfs, manifestFile.cid.toString(), controller.signal, this.deps.gatewayConfig.ipfsTimeout);
          const manifest = fileContents.toString();
          const parsed = JSON.parse(manifest);
  
          if(parsed.name) {
            return {
              cid: info.ipfsHash,
              name: parsed.name,
              manifest: {
                cid: manifestFile.cid.toString(),
                name: manifestFile.name,
              },
              schema: {
                cid: schemaFile.cid.toString(),
                name: schemaFile.name,
              },
              size: wrapperSize
            };
          } 
        }
  
        return {
          cid: infos[index].ipfsHash,
          name: WRAPPER_DEFAULT_NAME,
          manifest: {
            cid: manifestFile.cid.toString(),
            name: manifestFile.name,
          },
          schema: {
            cid: schemaFile.cid.toString(),
            name: schemaFile.name,
          },
          size: wrapperSize
        };
      }));

      wrappers = wrappers.filter(x => !!x);

      res.render('pins', {
        wrappers: wrappers,
        count: wrappers.length,
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
        const items = await asyncIterableToArray(
          ipfs.ls(ipfsPath, {
            signal: controller.signal,
            timeout: this.deps.gatewayConfig.ipfsTimeout
          })
        );

        //The stat API doesn't show size for subdirectories
        //So we need to go through the contents of the directory to find subdirectories
        //and get their size
        for (const item of items) {
          if (item.type === "dir") {
            const stat = await ipfs.files.stat(`/ipfs/${item.path}`, {
              size: true, 
              signal: controller.signal,
              timeout: this.deps.gatewayConfig.ipfsTimeout
            });
            item.size = stat.cumulativeSize;
          }
        }

        return res.render("ipfs-directory-contents", {
          items: items,
          path: ipfsPath,
          totalSizeInKb: formatFileSize(contentDescription.cumulativeSize),
          sizeInKb: function () {
            return formatFileSize((this as any).size)
          },
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
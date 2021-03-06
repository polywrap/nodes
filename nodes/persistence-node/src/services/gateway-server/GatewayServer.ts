import { WRAP_INFO, WasmPackageValidator } from "@polywrap/package-validation";
import axios from "axios";
import timeout from "connect-timeout";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import http from "http";
import * as IPFS from "ipfs-core";
import multer, { memoryStorage } from "multer";
import mustacheExpress from "mustache-express";
import path from "path";
import { URL } from "url";
import { GatewayConfig } from "../../config/GatewayConfig";
import { IndexerConfig } from "../../config/IndexerConfig";
import { PersistenceConfig } from "../../config/PersistenceConfig";
import { VERSION } from "../../constants/version";
import { WRAPPER_DEFAULT_NAME } from "../../constants/wrappers";
import { handleError } from "../../http-server/handleError";
import { addFilesToIpfs, getIpfsFileContents } from "../../ipfs";
import { addFilesAsDirToIpfs } from "../../ipfs/addFilesAsDirToIpfs";
import { InMemoryFile, IpfsAddResult, IpfsErrorResponse, IpfsPackageReader, MulterFile } from "../../types";
import { TrackedIpfsHashStatus } from "../../types/TrackedIpfsHashStatus";
import { formatFileSize } from "../../utils/formatFileSize";
import { IndexRetriever } from "../IndexRetriever";
import { Logger } from "../Logger";
import { PersistenceStateManager } from "../PersistenceStateManager";
import { ValidationService } from "../ValidationService";
import { WrapperWithFileList } from "./models/WrapperWithFileList";
import { deserializeWrapManifest } from "@polywrap/wrap-manifest-types-js";

interface IDependencies {
  logger: Logger;
  persistenceStateManager: PersistenceStateManager;
  ipfsNode: IPFS.IPFS;
  gatewayConfig: GatewayConfig;
  persistenceConfig: PersistenceConfig;
  validationService: ValidationService;
  indexerConfig: IndexerConfig;
  indexRetriever: IndexRetriever;
}

function prefix(words: string[]){
  // check border cases size 1 array and empty first word)
  if (!words[0] || words.length ==  1) return words[0] || "";
  let i = 0;
  // while all words have the same character at position i, increment i
  while(words[0][i] && words.every(w => w[i] === words[0][i]))
    i++;
  
  // prefix is the substring from the beginning to the last successfully checked i
  return words[0].substr(0, i);
}

export const stripBasePath = (files: InMemoryFile[]) => {
  const basePath = prefix(files.map(f => f.path));

  return files.map(file => ({
    path: path.relative(basePath, file.path) ?? '.',
    content: file.content
  })).filter(file => !!file.path);
};

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

    app.post('/api/v0/get', handleError(async (req, res) => {
      const controller = new AbortController();

      req.on('close', () => {
        controller.abort();
      });

      const hash = req.query.arg as string;

      if (!hash) {
        res.status(422).send("Hash parameter missing.");
        return;
      }

      res.writeHead(200, {
        'Content-Type': 'application/json',
      });

      const results = this.deps.ipfsNode.get(hash, { 
        timeout: this.deps.gatewayConfig.ipfsTimeout
      });

      for await (const result of results) {
        res.write(result);
      }

      res.end();
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

      const fileContents = await getIpfsFileContents(ipfs, hash, this.deps.gatewayConfig.ipfsTimeout, controller.signal);

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
        if (info.status !== TrackedIpfsHashStatus.Pinned) {
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
        .filter(x => x.status === TrackedIpfsHashStatus.Pinned)
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
          const manifestFile = wrapper.files.find(x => WRAP_INFO === x.name);

          if (!manifestFile) {
            return undefined;
          }

          const reader = new IpfsPackageReader(this.deps.ipfsNode, wrapper.cid);
          const manifestContent = await reader.readFile(manifestFile?.name);
          const manifest = deserializeWrapManifest(manifestContent);
    
          if(manifest.name) {
            return {
              name: manifest.name,
              version: manifest.version,
              type: manifest.type,
              size: wrapperSize,
              cid: wrapper.cid,
              indexes: info.indexes,
            };
          }

          return {
            name: WRAPPER_DEFAULT_NAME,
            version: manifest.version,
            type: manifest.type,
            size: wrapperSize,
            cid: infos[index].ipfsHash,
            indexes: info.indexes,
          };
        }))
      ).filter(x => !!x);

      if (req.query.json) {
        res.json(pinnedWrappers);
        return;
      }
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
        const fileContent = await getIpfsFileContents(ipfs, ipfsPath, this.deps.gatewayConfig.ipfsTimeout, controller.signal);
        res.end(fileContent);
      } else if (contentDescription.type === "directory") {
        const object = await ipfs.object.get(contentDescription.cid, {
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

    app.get("/status/:cid", handleError(async (req, res) => {
      const cid = (req.params as any).cid as string;
      const controller = new AbortController();

      req.on('close', () => {
        controller.abort();
      });

      const trackedInfo = this.deps.persistenceStateManager.getTrackedIpfsHashInfo(cid);

      if (!trackedInfo) {
        res.status(404).send();
        return;
      }

      if (req.query.json) {
        res.json(trackedInfo);
        return;
      }

      res.send(`<pre>${
        JSON.stringify(
          trackedInfo
        , null, 2)
      }</pre>`);
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

      const uploadRequest: { files: MulterFile[] } = req.files as { files: MulterFile[] };
      const filesToAdd = uploadRequest.files.map(x => ({
        path: x.originalname,
        content: x.buffer
      }));

      const result = await this.deps.validationService.validateInMemoryWrapper(filesToAdd);

      if (!result.valid) {
        res.status(500).json(this.buildIpfsError(`Upload is not a valid wrapper. Reason: ${result.failReason}`));
        return;
      }

      const cid = await addFilesAsDirToIpfs(
        filesToAdd,
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

      const filesToAdd: InMemoryFile[] = files.map(x => {
        const pathToFile = decodeURIComponent(x.originalname);

        //If the file is a directory, we don't add the buffer, otherwise we get a different CID than expected
        if (x.mimetype === "application/x-directory") {
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

      const sanitizedFiles = stripBasePath(filesToAdd);
      const result = await this.deps.validationService.validateInMemoryWrapper(sanitizedFiles);
     
      if(!result.valid) {
        res.status(500).json(this.buildIpfsError(`Upload is not a valid wrapper. Reason: ${result.failReason}`));
        return;
      }

      const { rootCid, addedFiles } = await addFilesToIpfs(
        sanitizedFiles,
        { onlyHash: !!req.query["only-hash"] },
        ipfs
      );

      this.deps.logger.log(`Gateway add: ${rootCid}`);

      if(!rootCid) {
        res.status(500).json(this.buildIpfsError(`IPFS verification failed after upload. Upload is not a directory`));
        return;
      }

      const [validationError, ipfsResult] = await this.deps.validationService.validateIpfsWrapper(rootCid);

      if (validationError || !ipfsResult || !ipfsResult.valid) {
        if(ipfsResult && ipfsResult.valid) {
          res.status(500).json(this.buildIpfsError(`IPFS verification failed after upload. Upload is not a valid wrapper. Reason: ${ipfsResult.failReason}`));
        } else {
          res.status(500).json(this.buildIpfsError(`IPFS verification failed after upload. Upload is not a valid wrapper`));
        }
        return;
      }

      res.writeHead(200, {
        'Content-Type': 'application/json',
      });

      for (const file of addedFiles) {
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
      const status = {
        online: true,
        version: VERSION,
        trackedIpfsHashesStatusCounts: this.getTrackedIpfsHashesStatusCounts(),
        indexers: await this.getIndexersInfo(),
      };

      if (req.query.json) {
        res.json(status);
        return;
      }

      res.send(`<pre>${
        JSON.stringify(
        status
        , null, 2)
      }</pre>`);
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

  getTrackedIpfsHashesStatusCounts() {
    return this.deps.persistenceStateManager.getTrackedIpfsHashInfos().reduce((acc, info) => {
      if (!acc[info.status]) {
        acc[info.status] = 0;
      }

      acc[info.status] = acc[info.status] + 1;

      return acc;
    }, {} as any);
  }

  async getIndexersInfo() {
    const indexerResults = this.deps.indexerConfig.indexes.map(indexer => {
      return axios({
        method: 'GET',
        url: new URL('status', indexer.provider).href,
      }).then(response => {
        return {
          ...response.data,
          lastSync: this.deps.indexRetriever.lastIndexSync[indexer.name] ?? "Unknown"
        };
      })
        .catch(error => {
          const message = `Error getting status for indexer ${indexer.provider}: ${error.message}`;
          this.deps.logger.log(message);
          return { error: message }
        });
    });

    return await Promise.all([
      ...indexerResults
    ]);
  }
}
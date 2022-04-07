import express, { NextFunction, Request, Response } from "express";
import multer, { memoryStorage } from "multer";
import mustacheExpress from "mustache-express";
import path from "path";
import { HttpConfig } from "../api-server/HttpConfig";
import { HttpsConfig } from "../api-server/HttpsConfig";
import { runServer } from "../api-server/runServer";
import { addFilesAsDirToIpfs } from "../ipfs-operations/addFilesAsDirToIpfs";
import { MainDependencyContainer } from "../modules/daemon/daemon.deps";
import { MulterFile } from "../MulterFile";
import { asyncIterableToArray } from "../utils/asyncIterableToArray";
import { formatFileSize } from "../utils/formatFileSize";
import { getIpfsFileContents } from "../getIpfsFileContents";
import { handleError } from "../api-server/handleError";

export class IpfsGatewayApi {
  deps: MainDependencyContainer;

  constructor(deps: MainDependencyContainer) {
    this.deps = deps;
  }

  async run(
    httpConfig: HttpConfig,
    httpsConfig: HttpsConfig
  ) {
    const ipfs = this.deps.ipfsNode;

    const app = express();

    app.engine('html', mustacheExpress());
    app.set('view engine', 'html');
    app.set('views', path.join(__dirname, '../ui'));

    const upload = multer({
      storage: memoryStorage(),
      limits: {
        fileSize: 1 * 1024 * 1024,
        files: 7
      }
    });

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
        this.deps.logger.log(`Request:  ${req.method} --- ${req.url}`);
        next();
      }
    }));

    app.use((req, res, next) => {
      res.on('finish', () => {
        this.deps.logger.log(`Response: ${req.method} ${res.statusCode} ${req.url}`);
      });
      next();
    });

    app.get('/api/v0/cat', handleError(async (req, res) => {
      const hash = req.query.arg as string;

      if (!hash) {
        res.status(422).send("Hash parameter missing.");
        return;
      }

      const fileContents = await getIpfsFileContents(ipfs, hash);

      res.send(fileContents);
    }));

    app.get('/api/v0/resolve', handleError(async (req, res) => {
      const hash = req.query.arg as string;

      const resolvedPath = await ipfs.resolve(`/ipfs/${hash}`);

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
        pinnedIpfsHashes,
        count: pinnedIpfsHashes.length,
      })
    }));

    app.get("/ipfs/:path(*)", handleError(async (req, res) => {
      const ipfsPath = (req.params as any).path as string;

      const contentDescription = await ipfs.files.stat(`/ipfs/${ipfsPath}`);

      if (contentDescription.type === "file") {
        const fileContent = await getIpfsFileContents(ipfs, ipfsPath);
        res.end(fileContent);
      } else if (contentDescription.type === "directory") {
        const items = await asyncIterableToArray(
          ipfs.ls(ipfsPath)
        );

        //The stat API doesn't show size for subdirectories
        //So we need to go through the contents of the directory to find subdirectories
        //and get their size
        for (const item of items) {
          if (item.type === "dir") {
            const stat = await ipfs.files.stat(`/ipfs/${item.path}`, { size: true });
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
        throw Error("Unsupported file type");
      }
    }));

    app.get("/ens/:network/:ensDomain", handleError(async (req, res) => {
      const {
        network,
        ensDomain,
      } = req.params as any

      const [error, ipfsHash] = await this.deps.ensIndexerApp.resolveContenthash(network, ensDomain);

      if (ipfsHash) {
        res.redirect(`/ipfs/${ipfsHash}`)
      } else {
        res.status(422).send(error)
      }
    }));

    app.post('/add', upload.fields([{ name: "files" }, { name: "options", maxCount: 1 }]), handleError(async (req, res) => {
      if (!req.files) {
        res.json({
          error: "No files were uploaded"
        });
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

    runServer(httpConfig, httpsConfig, app);
  }
}
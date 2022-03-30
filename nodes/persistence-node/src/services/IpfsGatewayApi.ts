import express, { NextFunction, Request, Response } from "express";
import multer, { memoryStorage } from "multer";
import mustacheExpress from "mustache-express";
import path from "path";
import { HttpConfig } from "../api-server/HttpConfig";
import { HttpsConfig } from "../api-server/HttpsConfig";
import { runServer } from "../api-server/runServer";
import { getPinnedWrapperCIDs } from "../getPinnedWrapperCIDs";
import { addFilesAsDirToIpfs } from "../ipfs-operations/addFilesAsDirToIpfs";
import { MainDependencyContainer } from "../modules/daemon/daemon.deps";
import { MulterFile } from "../MulterFile";
import { asyncIterableToArray } from "../utils/asyncIterableToArray";
import { formatFileSize } from "../utils/formatFileSize";

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
        this.deps.logger.log("Request: " + req.method + " " + req.url);
        next();
      }
    }));

    app.get('/api/v0/cat', handleError(async (req, res) => {
      const hash = req.query.arg as string;

      if (!hash) {
        res.status(422).send("Hash parameter missing.");
        return;
      }

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
    }));

    app.get('/api/v0/resolve', handleError(async (req, res) => {
      const hash = req.query.arg as string;

      const resolvedPath = await ipfs.resolve(`/ipfs/${hash}`);

      res.json({
        path: resolvedPath
      });
    }));

    app.get('/pin/ls', handleError(async (req, res) => {
      const pinned = await getPinnedWrapperCIDs(this.deps.storage, this.deps.ipfsNode, this.deps.logger)

      res.render('ipfs-pinned-files', {
        pinned,
        count: pinned.length,
      })
    }));

    app.get('/ipfs/:hash', handleError(async (req, res) => {
      const hash = (req.params as any).hash as string;

      const files = await asyncIterableToArray(
        ipfs.ls(hash)
      );

      res.render('ipfs-directory-contents', {
        files,
        hash,
        sizeInKb: function () {
          return formatFileSize((this as any).size)
        }
      })
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

function handleError(callback: (req: Request<{}>, res: Response, next: NextFunction) => Promise<void>) {
  return function (req: Request<{}>, res: Response, next: NextFunction) {
    callback(req, res, next)
      .catch(next)
  }
}
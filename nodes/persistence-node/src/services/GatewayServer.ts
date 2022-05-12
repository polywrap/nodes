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

export class GatewayServer {
  deps: MainDependencyContainer;

  constructor(deps: MainDependencyContainer) {
    this.deps = deps;
  }

  async run() {
    const ipfs = this.deps.ipfsNode;

    const app = express();

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
        pinned: pinnedIpfsHashes,
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
      res.status(500).json(this.buildIpfsError("Something went wrong. Check the logs for more info."));
      this.deps.logger.log(err.message);
    });

    runServer(
      app,
      this.deps.gatewayPort, 
      this.deps.logger,
      () => console.log(`Gateway listening on http://localhost:${this.deps.gatewayPort}`)
    );
  }

  buildIpfsError(message: string): IpfsErrorResponse {
    this.deps.logger.log("Gateway error: " + message);
  
    return {
      Message: message,
      Type: "error"
    };
  }
}
import express from "express";
import multer, { memoryStorage } from "multer";
import { MulterFile } from "../MulterFile";
import { HttpConfig } from "../api-server/HttpConfig";
import { HttpsConfig } from "../api-server/HttpsConfig";
import { runServer } from "../api-server/runServer";
import { addFilesAsDirToIpfs } from "../ipfs-operations/addFilesAsDirToIpfs";
import { LoggerConfig } from "../config/LoggerConfig";

interface IDependencies {
  loggerConfig: LoggerConfig;
}

export class Logger {
  deps: IDependencies;

  constructor(deps: IDependencies) {
    this.deps = deps;
  }

  async log(
    message: string
  ) {
    if(this.deps.loggerConfig.shouldLog) {
      const timestamp = new Date().toLocaleString();
      console.log(`${timestamp}: ${message}`);
    }
  }
}

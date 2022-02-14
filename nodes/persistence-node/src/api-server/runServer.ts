import { HttpConfig } from "./HttpConfig";
import fs from "fs";
import https from "https";
import http from "http";
import path from "path";
import { HttpsConfig } from "./HttpsConfig";
import cors from "cors";

export const runServer = (httpConfig: HttpConfig, httpsConfig: HttpsConfig, app: any) => {
  app.use(cors({
    origin: "*",
  }));

  if(httpConfig) {
    const server = http.createServer({}, app);
    
    server.listen(httpConfig.port, function(){
      console.log(`HTTP server started at http://localhost:${httpConfig.port}` );
    });
  } 

  if(httpsConfig) {
    if(!httpsConfig.sslDir) {
      throw new Error("SSL directory not specified");
    }

    const options = {
      key: fs.readFileSync(path.join(httpsConfig.sslDir, "key.pem"), { encoding: "utf-8" }),
      cert: fs.readFileSync(path.join(httpsConfig.sslDir, "cert.pem"), { encoding: "utf-8" }),
      ca: fs.readFileSync(path.join(httpsConfig.sslDir, "ca.pem"), { encoding: "utf-8" }),
    };

    const server = https.createServer(options, app);
    
    server.listen(httpsConfig.port, function(){
      console.log(`HTTPS server started at http://localhost:${httpsConfig.port}` );
    });
  }
};
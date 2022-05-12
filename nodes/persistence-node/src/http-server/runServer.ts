import http from "http";
import cors from "cors";
import { Request, Response, NextFunction } from "express";
import { Logger } from "../services/Logger";
import { handleError } from "./handleError";

export const runServer = (app: any, port: number, logger: Logger, onStart: () => void) => {
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
      logger.log(`Request:  ${req.method} --- ${req.url}`);
      next();
    }
  }));


  app.use((req: Request, res: Response, next: NextFunction) => {
    res.on('finish', () => {
      logger.log(`Response: ${req.method} ${res.statusCode} ${req.url}`);
    });
    next();
  });
  
  app.use(cors({
    origin: "*",
  }));

  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    res.status(500).send("Something went wrong. Check the logs for more info.");
    logger.log(err.message);
  });
  
  const server = http.createServer({}, app);
  
  server.listen(port, onStart);
};
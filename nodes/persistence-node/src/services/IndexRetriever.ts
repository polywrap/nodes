import { Logger } from "./Logger";
import { IndexerConfig } from "../config/IndexerConfig";
import axios, { AxiosError } from "axios";
import { URL } from 'url';
import { CIDWithEnsNodes, IPFSIndex } from "../types";

interface IDependencies {
  indexerConfig: IndexerConfig;
  logger: Logger;
}

export class IndexRetriever {
  deps: IDependencies;

  lastIpfsIndexSync: Record<string, Date> = {};
  lastEnsTextRecordIndexSync: Record<string, Date> = {};

  constructor(deps: IDependencies) {
    this.deps = deps;
  }

  async getCIDsWithEnsNodes(): Promise<IPFSIndex[]> {
    const indexes: IPFSIndex[] = [];

    for(const index of this.deps.indexerConfig.indexes) {
      try {
        const response = await axios({
          method: 'GET',
          url: new URL('api/ipfs/list-with-ens-nodes', index.provider).href,
        });
        
        if(response.status === 200) {
          this.deps.logger.log(`Successfully retrieved CIDs from ${index.name} (${response.data.length})`);
          indexes.push({
            name: index.name,
            cids: response.data as CIDWithEnsNodes[],
            error: false
          });
          this.lastIpfsIndexSync[index.name] = new Date();
          continue;
        } else {
          this.deps.logger.log(`Failed to get CIDs from ${index.name}, status code: ${response.status}`);
        }
      }
      catch(err) {
        const error = (err as AxiosError).response?.data.error
          ? (err as AxiosError).response?.data.error
          : JSON.stringify(err);

        this.deps.logger.log(`Failed to get CIDs from ${index.name}, error: ${error}`);
      }

      indexes.push({
        name: index.name,
        cids: [],
        error: true
      });
    }

    return indexes;
  }

  async getEnsNodesWithTextRecords(network: string): Promise<{
    node: string,
    textRecords: {
      key: string,
      value: string
    }[]
  }[]> {
    try {
      const indexes = this.deps.indexerConfig.ensTextRecordIndexes.find(x => x.name === `ensTextRecord-${network}`);
      const indexes: IPFSIndex[] = [];

      for(const index of this.deps.indexerConfig.indexes) {
        try {
          const response = await axios({
            method: 'GET',
            url: new URL('api/ipfs/list-with-ens-nodes', index.provider).href,
          });
          
          if(response.status === 200) {
            this.deps.logger.log(`Successfully retrieved CIDs from ${index.name} (${response.data.length})`);
            indexes.push({
              name: index.name,
              cids: response.data as CIDWithEnsNodes[],
              error: false
            });
            this.lastIpfsIndexSync[index.name] = new Date();
            continue;
          } else {
            this.deps.logger.log(`Failed to get CIDs from ${index.name}, status code: ${response.status}`);
          }
        }
        catch(err) {
          const error = (err as AxiosError).response?.data.error
            ? (err as AxiosError).response?.data.error
            : JSON.stringify(err);
  
          this.deps.logger.log(`Failed to get CIDs from ${index.name}, error: ${error}`);
        }
  
        indexes.push({
          name: index.name,
          cids: [],
          error: true
        });
      }
  
      return indexes;
    }
}

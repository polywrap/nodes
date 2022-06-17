import * as IPFS from 'ipfs-core';
import { ipfsPathExists, getIpfsFileContents } from "../ipfs";
import path from "path";
import { PackageReader, PathStats } from '@web3api/core-validation';

export class IpfsPackageReader implements PackageReader {
  ipfsTimeout: number = 1000;
 
  constructor(private readonly ipfsNode: IPFS.IPFS, public readonly wrapperIpfsPath: string) {
  }

  async readFileAsString(filePath: string): Promise<string> {
    const contents = await getIpfsFileContents(this.ipfsNode, path.join(this.wrapperIpfsPath, filePath), this.ipfsTimeout);
    return contents.toString();
  }

  readFile(filePath: string): Promise<Buffer> {
    return getIpfsFileContents(this.ipfsNode, path.join(this.wrapperIpfsPath, filePath), this.ipfsTimeout);
  }

  exists(itemPath: string): Promise<boolean> {
    return ipfsPathExists(this.ipfsNode, path.join(this.wrapperIpfsPath, itemPath), this.ipfsTimeout);
  }

  async getStats(itemPath: string): Promise<PathStats> {
    const stat = await this.ipfsNode.files.stat(path.join(this.wrapperIpfsPath, itemPath), {
      timeout: this.ipfsTimeout
    });
    return {
      isFile: stat.type === "file",
      isDir: stat.type === "directory",
      size: stat.size,
    };
  }

  async readDir(dirPath: string): Promise<string[]> {
    const ipfsPath = await this.ipfsNode.resolve(path.join(this.wrapperIpfsPath, dirPath));
    const cid = ipfsPath.substring("/ipfs/".length);
    const info = await this.ipfsNode.object.get(IPFS.CID.parse(cid), {
      timeout: this.ipfsTimeout,
    });

    return info.Links
      .filter(x => x.Name)
      .map(x => x.Name as string);
  }
}

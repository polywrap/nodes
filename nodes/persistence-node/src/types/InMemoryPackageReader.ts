import { InMemoryFile } from "../types";
import { PackageReader, PathStats } from '@web3api/core-validation';

export class InMemoryPackageReader implements PackageReader {
  private root: any = {};
  
  constructor(public readonly files: InMemoryFile[]) {
    for(const file of files) {
      let fPath = "";
      if(file.path.startsWith("./")) {
        fPath = file.path.substring("./".length, file.path.length);
      } else {
        fPath = file.path;
      }
  
      const parts = fPath.split("/");
      let head = this.root;
      for(const part of parts) {
        if(!head[part]) {
          head[part] = {};
        }
        head = head[part];
      }
  
      head[parts[parts.length - 1]] = file;
    }
  }

  readFileAsString(filePath: string): Promise<string> {
    const contents = (this.find(filePath) as InMemoryFile).content as Buffer;
    return Promise.resolve(contents.toString());
  }

  readFile(filePath: string): Promise<Buffer> {
    return Promise.resolve((this.find(filePath) as InMemoryFile).content as Buffer);
  }

  exists(itemPath: string): Promise<boolean> {
    return Promise.resolve(!!this.find(itemPath));
  }

  async getStats(itemPath: string): Promise<PathStats> {
    const stat = this.find(itemPath);
    return {
      isFile: stat !== "directory",
      isDir: stat === "directory",
      size: stat !== "directory"
        ? ((stat as InMemoryFile).content as Buffer).length
        : 0,
    };
  }

  readDir(dirPath: string): Promise<string[]> {
    const dir = this.find(dirPath);

    return Promise.resolve(Object.keys(dir as any));
  }

  private find(itemPath: string): InMemoryFile | "directory" | undefined {
    const parts = itemPath.split("/");
    let head = this.root;
    for(const part of parts) {
      if(!head[part]) {
        return undefined;
      }
      head = head[part];
    }
    return head?.path
      ? (head as InMemoryFile).content === undefined
        ? "directory"
        : head
      : "directory";
  }
}

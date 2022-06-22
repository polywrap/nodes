import { InMemoryFile } from "../types";
import { PackageReader, PathStats } from "@polywrap/package-validation";

const trimLocalPath = (path: string): string => {
  let trimmedPath = "";
  if(path.startsWith("./")) {
    trimmedPath = path.substring("./".length, path.length);
  } else {
    trimmedPath = path;
  }

  return trimmedPath;
};

export class InMemoryPackageReader implements PackageReader {
  private root: any = {};
  private fileMap: Record<string, InMemoryFile> = {};
  
  constructor(public readonly files: InMemoryFile[]) {
    for(const file of files) {
      let sanitizedPath = trimLocalPath(file.path);

      this.fileMap[sanitizedPath] = file;

      const parts = sanitizedPath.split("/");
      let head = this.root;
      for(let i = 0; i < parts.length; i++) {
        const part = parts[i];

        if(!head[part]) {
          head[part] = {};
        }

        head = head[part];
      }

    }
  }

  readFileAsString(filePath: string): Promise<string> {
    const contents = (this.findFile(filePath) as InMemoryFile).content as Buffer;
    console.log("x", filePath);
    return Promise.resolve(contents.toString());
  }

  readFile(filePath: string): Promise<Buffer> {
    return Promise.resolve((this.findFile(filePath) as InMemoryFile).content as Buffer);
  }

  exists(itemPath: string): Promise<boolean> {
    console.log("exists", itemPath);
    return Promise.resolve(!!this.findPath(itemPath));
  }

  async getStats(itemPath: string): Promise<PathStats> {
    console.log("getStats", itemPath);
    const file = this.findFile(itemPath);
    const isFile = !!(file && file.content);
    console.log("isFile", isFile);

    return {
      isFile: isFile,
      isDir: !isFile,
      size: isFile && file.content
        ? file.content.length
        : 0,
    };
  }

  readDir(dirPath: string): Promise<string[]> {
    console.log("readDir1", dirPath);
    const dir = this.findPath(dirPath);
    console.log("readDir2", dir);
    console.log("readDir2", Object.keys(dir as any));

    return Promise.resolve(Object.keys(dir as any));
  }

  private findPath(itemPath: string): any {
    let sanitizedPath = trimLocalPath(itemPath);

    if (sanitizedPath === "") {
      return this.root;
    }

    const parts = sanitizedPath.split("/");
    let head = this.root;
    for(const part of parts) {
      if(!head[part]) {
        return undefined;
      }
      head = head[part];
    }

    return head;
  }

  private findFile(filePath: string): InMemoryFile | undefined {
    let sanitizedPath = trimLocalPath(filePath);

    return this.fileMap[sanitizedPath];
  }
}

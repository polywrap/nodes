import { InMemoryFile } from "../types";
import { PackageReader, PathStats } from "@polywrap/package-validation/v0_1";

const trimLocalPath = (path: string): string => {
  let trimmedPath = "";
  if (path.startsWith("./")) {
    trimmedPath = path.substring("./".length, path.length);
  } else if (path === ".") {
    trimmedPath = "";
  } else {
    trimmedPath = path;
  }

  return trimmedPath;
};

export class InMemoryPackageReader implements PackageReader {
  private root: any = {};
  private fileMap: Record<string, InMemoryFile> = {};

  constructor(public readonly files: InMemoryFile[]) {
    for (const file of files) {
      const sanitizedPath = trimLocalPath(file.path);

      this.fileMap[sanitizedPath] = file;

      const parts = sanitizedPath.split("/");
      let head = this.root;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];

        if (!head[part]) {
          head[part] = {};
        }

        head = head[part];
      }
    }
  }

  readFileAsString(filePath: string): Promise<string> {
    const contents = (this.findFile(filePath) as InMemoryFile).content as Buffer;
    return Promise.resolve(contents.toString());
  }

  readFile(filePath: string): Promise<Buffer> {
    return Promise.resolve(
      (this.findFile(filePath) as InMemoryFile).content as Buffer
    );
  }

  exists(itemPath: string): Promise<boolean> {
    return Promise.resolve(!!this.findPath(itemPath));
  }

  async getStats(itemPath: string): Promise<PathStats> {
    const file = this.findFile(itemPath);
    const isFile = !!(file && file.content && file.content.byteLength);

    return {
      isFile: isFile,
      isDir: !isFile,
      size: isFile && file.content ? file.content.byteLength : 0,
    };
  }

  readDir(dirPath: string): Promise<string[]> {
    const dir = this.findPath(dirPath);

    return Promise.resolve(Object.keys(dir as any));
  }

  private findPath(itemPath: string): any {
    const sanitizedPath = trimLocalPath(itemPath);

    if (sanitizedPath === "") {
      return this.root;
    }

    const parts = sanitizedPath.split("/");
    let head = this.root;
    for (const part of parts) {
      if (!head[part]) {
        return undefined;
      }
      head = head[part];
    }

    return head;
  }

  private findFile(filePath: string): InMemoryFile | undefined {
    const sanitizedPath = trimLocalPath(filePath);

    return this.fileMap[sanitizedPath];
  }
}

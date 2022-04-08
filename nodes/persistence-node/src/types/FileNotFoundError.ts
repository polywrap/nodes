export class FileNotFoundError extends Error {
  constructor(msg: string) {
    super(msg);
    Object.setPrototypeOf(this, FileNotFoundError);
  }
}
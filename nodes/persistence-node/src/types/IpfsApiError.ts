export class IpfsApiError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, IpfsApiError.prototype);
  }
}

export class Result<T = any> {

  constructor(
    private readonly result: T,
    private readonly error: string | null = null
  ) {}

  static Ok = <T> (result: T) => {
    return new Result(result)
  };

  static Error = (error: string) => {
    return new Result(null, error)
  };

  unwrapOrThrow = () => {
    if (this.error != null) {
      throw new Error(this.error);
    }

    if (this.result == null) {
      throw new Error("Result not set");
    }

    return this.result;
  };

  unwrapOr = (callback: (error: string) => void) => {
    if (this.error != null) {
      callback(this.error)
    }

    if (this.result == null) {
      throw callback("Result not set");
    }

    return this.result;
  };
}
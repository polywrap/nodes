export async function asyncIterableToArray<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  let result: T[] = []

  for await (let item of iterable) {
    result.push(item);
  }
  
  return result;
};
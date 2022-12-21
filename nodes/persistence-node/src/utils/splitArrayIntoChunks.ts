export const splitArrayIntoChunks = <T>(array: T[], chunkSize: number): T[][] => {
  const result = [];
  let index = 0;
  while (index < array.length) {
    result.push(array.slice(index, index + chunkSize));
    index += chunkSize;
  }
  return result;
}

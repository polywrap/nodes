const textExtensions = [".graphql", ".yaml"]

export const isTextFile = (fileName: string): boolean => {
  return textExtensions.some(ext => fileName.endsWith(ext));
};
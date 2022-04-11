export const toShortString = (str: string): string => {
  return str
    ? `${str.slice(0, 6)}...${str.slice(-4, str.length)}`
    : "undefined";
};

module.exports = {
  collectCoverage: true,
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/?(*.)+(spec|test).[jt]s?(x)"],
  modulePathIgnorePatterns: [],
  roots: ["./src/__tests__/jest"],
  globals: {
    "ts-jest": {
      diagnostics: false,
    },
  },
};

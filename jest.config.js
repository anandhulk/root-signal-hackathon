const { defaults } = require("jest-config");

module.exports = {
  testEnvironment: "node",
  testRegex: "./__tests/.*\\.(test|spec)?\\.(ts|tsx)$",
  moduleFileExtensions: [...defaults.moduleFileExtensions, "ts", "tsx"],
  collectCoverageFrom: ["src/**"],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 100,
      lines: 90,
      statements: -10,
    },
  },
  "setupFilesAfterEnv": ["./__tests/config/setup.ts"]
};

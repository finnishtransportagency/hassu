module.exports = {
  collectCoverageFrom: ["<rootDir>/src/__tests__/**/*.{js,jsx,ts,tsx}", "<rootDir>/src/**/*.test.{js,jsx,ts,tsx}"],
  moduleNameMapper: {
    /* Handle CSS imports (with CSS modules)
    https://jestjs.io/docs/webpack#mocking-css-modules */
    "^.+\\.module\\.(css|sass|scss)$": "identity-obj-proxy",

    // Handle CSS imports (without CSS modules)
    "^.+\\.(css|sass|scss)$": "<rootDir>/src/__mocks__/styleMock.js",

    /* Handle image imports
    https://jestjs.io/docs/webpack#handling-static-assets */
    "^.+\\.(jpg|jpeg|png|gif|webp|svg)$": "<rootDir>/src/__mocks__/fileMock.js",
    "^@components/(.*)$": "<rootDir>/src/components/$1",
    "^@graphql/(.*)$": "<rootDir>/src/graphql/$1",
    "^@common/(.*)$": "<rootDir>/common/$1",
    "^@services/(.*)$": "<rootDir>/src/services/$1",
    "^@pages/(.*)$": "<rootDir>/src/pages/$1",
    "^common/(.*)$": "<rootDir>/common/$1",
    "^components/(.*)$": "<rootDir>/src/components/$1",
    "^src/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: ["<rootDir>/src/__tests__/**/*.[jt]s?(x)", "<rootDir>/src/**/*.test.{js,jsx,ts,tsx}"],
  testEnvironment: "jsdom",
  transform: {
    /* Use babel-jest to transpile tests with the next/babel preset
    https://jestjs.io/docs/configuration#transform-objectstring-pathtotransformer--pathtotransformer-object */
    "^.+\\.(js|jsx|ts|tsx)$": ["babel-jest", { presets: ["next/babel"] }],
  },
  transformIgnorePatterns: ["/node_modules/", "^.+\\.module\\.(css|sass|scss)$"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
};

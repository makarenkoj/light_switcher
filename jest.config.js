export default {
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
  ],
  transformIgnorePatterns: [
    "/node_modules/(?!node-fetch)/",
  ],
  transform: {
    '^.+\\.(js|jsx|mjs)$': 'babel-jest',
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^\\.\\.\\/controllers\\/indexController\\.js$': '<rootDir>/controllers/indexController.js',
  },
  moduleDirectories: ['node_modules', '<rootDir>'],
};

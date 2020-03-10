module.exports = {
  verbose: true,
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  globalSetup: './test/common/global-setup.ts',
  globalTeardown: './test/common/global-teardown.ts',
};

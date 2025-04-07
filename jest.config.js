module.exports = {
  testTimeout: 10000,
  collectCoverage: true,
  coverageReporters: ['lcov', 'text'],
  collectCoverageFrom: ['<rootDir>/src/**/*.{ts,js}']
};

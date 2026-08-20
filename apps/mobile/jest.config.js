module.exports = {
  preset: 'jest-expo',
  rootDir: '../..',
  roots: [
    '<rootDir>/apps/mobile',
    '<rootDir>/packages/application',
    '<rootDir>/packages/domain',
  ],
  setupFilesAfterEnv: ['<rootDir>/apps/mobile/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/apps/mobile/$1',
    '^@debtulator/domain/(.*)$': '<rootDir>/packages/domain/src/$1',
    '^@debtulator/application/(.*)$': '<rootDir>/packages/application/src/$1',
    '^@debtulator/contracts/(.*)$': '<rootDir>/packages/contracts/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|expo(nent)?|@expo(nent)?/.*|@expo/ui|react-navigation|@react-navigation/.*))',
  ],
};

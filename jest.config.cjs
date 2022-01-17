module.exports = {
    modulePathIgnorePatterns: ["<rootDir>/dist/"],
    transform: {
        '^.+\\.ts$': 'ts-jest',
        '^.+\\.js$': 'ts-jest',
    },
    moduleFileExtensions: ['js', 'ts'],
    setupFilesAfterEnv: ['<rootDir>/jest-setup.ts'],
    resetMocks: true,
}

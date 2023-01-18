module.exports = {
    verbose: true,
    rootDir: "src",
    testMatch: ["**/*.spec.js"],
    testPathIgnorePatterns: ["node_modules"],
    watchPathIgnorePatterns: ["\\**/.*(?<!spec).js"],
    transform: {
        "\\.[jt]sx?$": ["babel-jest", { rootMode: "upward" }],
    },
    globalSetup: "<rootDir>/common/test-global-setup.cjs",
    globalTeardown: "<rootDir>/common/test-global-teardown.cjs",
};

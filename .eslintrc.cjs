module.exports = {
  parser: "@typescript-eslint/parser", // Specifies the ESLint parser
  extends: [
    "plugin:@typescript-eslint/recommended", // Uses the recommended rules from the @typescript-eslint/eslint-plugin
    "plugin:prettier/recommended" // Enables eslint-plugin-prettier and displays prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
  ],
  parserOptions: {
    ecmaVersion: 2018, // Allows for the parsing of modern ECMAScript features
    sourceType: "module" // Allows for the use of imports
  },
  rules: {
    // Error
    "arrow-parens": ["error", "as-needed", { requireForBlockBody: false }],
    "comma-dangle": ["error", "never"],
    "max-lines": ["error", 5000],
    "no-console": ["error", { allow: ["warn", "error", "info"] }],
    "no-param-reassign": "off",
    "@typescript-eslint/no-use-before-define": ["error", { functions: false }]
  }
};

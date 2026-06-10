import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

// Backend-local flat config. Self-contained so `npx eslint` resolves a *local*
// eslint instead of walking up to the repo-root (React/browser) config.
export default tseslint.config(
  { ignores: ["dist", "node_modules", "prisma/migrations"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["src/**/*.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);

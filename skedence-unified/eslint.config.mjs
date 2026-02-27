import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "out 2/**",
    "build/**",
    "next-env.d.ts",
    // Ignore all root-level utility/migration scripts
    "*.js",
    "Scripts/**",
  ]),
  // Enforce React Hooks rules as ERRORS (not warnings)
  {
    rules: {
      "react-hooks/rules-of-hooks": "error", // Enforce hooks rules
      "react-hooks/exhaustive-deps": "error", // Enforce effect dependencies
    },
  },
]);

export default eslintConfig;


// Contains code generated or recommended by Amazon Q
import { FlatCompat } from "@eslint/eslintrc";
import { defineConfig, globalIgnores } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import tseslintPlugin from "@typescript-eslint/eslint-plugin";
import tseslintParser from "@typescript-eslint/parser";
import mochaNoOnly from "eslint-plugin-mocha-no-only";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

export default defineConfig([
  ...compat.extends("next/core-web-vitals"),

  globalIgnores([
    "next.config.js",
    "next.config.mjs",
    "next.config.ts",
    "backend/**/bin/**",
    "backend/**/node_modules/**",
    "backend/**/test/setup.js",
    "backend/src/velho/aineistopalvelu/**",
    "backend/src/velho/hakupalvelu/**",
    "backend/src/velho/projektirekisteri/**",
  ]),

  {
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          paths: [
            {
              name: "lodash",
              message: "Please use the native implementation instead.",
            },
          ],
        },
      ],
    },
  },

  // Backend-specific config (replaces backend/.eslintrc.json)
  {
    files: ["backend/**/*.ts"],
    plugins: {
      "@typescript-eslint": tseslintPlugin,
      "mocha-no-only": mochaNoOnly,
    },
    languageOptions: {
      parser: tseslintParser,
      parserOptions: {
        project: "./backend/tsconfig.json",
      },
    },
    rules: {
      "strict": "error",
      "object-shorthand": "warn",
      "@typescript-eslint/no-var-requires": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
        },
      ],
      "mocha-no-only/mocha-no-only": ["error"],
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        {
          assertionStyle: "as",
          objectLiteralTypeAssertions: "allow-as-parameter",
        },
      ],
      "@typescript-eslint/no-explicit-any": ["warn"],
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/explicit-module-boundary-types": "off",
    },
  },

  eslintConfigPrettier,
]);
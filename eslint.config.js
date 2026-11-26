import { defineConfig } from "eslint/config";
import prettierConfig from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  { ignores: ["dist/"] },
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: { allowDefaultProject: ["eslint.config.js"] },
        tsconfigRootDir: import.meta.dirname,
      },
      globals: globals.node,
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-floating-promises": [
        "error",
        {
          // node:test handles the promises returned by test() and its hooks.
          allowForKnownSafeCalls: [
            {
              from: "package",
              package: "node:test",
              name: ["test", "describe", "it", "suite", "before", "after"],
            },
          ],
        },
      ],
      // Numbers in template literals are safe and very common here.
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        {
          allowNumber: true,
          allowAny: false,
          allowBoolean: false,
          allowNever: false,
          allowNullish: false,
          allowRegExp: false,
        },
      ],
      "@typescript-eslint/no-misused-promises": "error",
      eqeqeq: "error",
      "no-console": "off",
    },
  },
  {
    files: ["**/*.js"],
    extends: [tseslint.configs.disableTypeChecked],
  },
  // Last: turns off the rules that conflict with Prettier.
  prettierConfig,
);

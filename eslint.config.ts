import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import playwright from "eslint-plugin-playwright";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist", "dev-dist", "src/components/ui"]),
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  reactRefresh.configs.vite,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser
    }
  },
  {
    files: ["e2e/**/*.ts"],
    plugins: { playwright },
    settings: {
      playwright: {
        messages: {
          noWaitForTimeout:
            "Avoid page.waitForTimeout() as it leads to flaky tests. Use locator.waitFor(), expect().toBeVisible(), or other condition-based waits instead."
        }
      }
    },
    rules: {
      "playwright/no-wait-for-timeout": "error"
    }
  }
]);

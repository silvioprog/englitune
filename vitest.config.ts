import { configDefaults, defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      exclude: [...configDefaults.exclude, "e2e"],
      coverage: {
        reporter: ["text"],
        include: ["src/lib/studyUtils.ts"],
        thresholds: {
          statements: 98,
          branches: 90,
          functions: 100,
          lines: 98
        }
      }
    }
  })
);

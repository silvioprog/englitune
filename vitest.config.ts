import { configDefaults, defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test-setup.ts"],
      exclude: [...configDefaults.exclude, "e2e"],
      coverage: {
        reporter: ["text"],
        include: ["src/lib/studyUtils.ts", "src/lib/speechUtils.ts"],
        thresholds: {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100
        }
      }
    }
  })
);

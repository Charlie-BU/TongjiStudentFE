import { mergeConfig } from "vite";
import { defineConfig } from "vitest/config";
import viteConfig from "./vite.config.ts";

// vitestConfig 复用 Vite 的 React 编译配置，并声明离线测试运行环境。
export default mergeConfig(
  viteConfig({ command: "serve", mode: "test" }),
  defineConfig({
    test: {
      environment: "jsdom",
      include: ["test/**/*.{test,spec}.{ts,tsx}"],
      setupFiles: ["./test/setup.ts"],
    },
  }),
);

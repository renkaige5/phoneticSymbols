import { defineConfig } from "vite";

export default defineConfig({
  // 相对路径：拷到机房任意目录、双击 index.html 也能找到资源
  base: "./",
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: "127.0.0.1",
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  envPrefix: ["VITE_", "TAURI_ENV_*"],
  build: {
    // 目标机器可能是 Win7 + 老旧 Chrome 内核（360极速等），降级到 ES2015
    target: "es2015",
    minify: "esbuild",
    sourcemap: false,
    outDir: "dist",
  },
});

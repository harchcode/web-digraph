/// <reference types="vitest" />
/// <reference types="vite/client" />

import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig(() => {
  if (process.env.BUILD_TYPE === "example") {
    return {
      build: {
        outDir: "dist-example"
      }
    };
  } else {
    return {
      test: {
        environment: "jsdom",
        watch: false,
        globals: true,
        coverage: {
          include: ["src/**/*.ts"],
          all: true,
          statements: 0,
          branches: 0,
          functions: 0,
          lines: 0
        }
      },
      build: {
        target: "ESNext",
        lib: {
          // Could also be a dictionary or array of multiple entry points
          entry: resolve(__dirname, "src/index.ts"),
          name: "Web Digraph",
          // the proper extensions will be added
          fileName: "web-digraph"
        }
      }
    };
  }
});

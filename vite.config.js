import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 3700,
    host: true
  },
  // base: "/src/example/",
  root: "example",
  build: {
    outDir: "dist-example"
  }
});

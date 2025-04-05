import { defineConfig } from "vite";
import electron from "vite-plugin-electron";
import react from "@vitejs/plugin-react";
import renderer from "vite-plugin-electron-renderer";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: "src/electron/main.ts",
        vite: {
          build: {
            outDir: "dist-electron",
            sourcemap: true,
            rollupOptions: {
              external: ["electron"],
            },
            target: "esnext",
          },
        },
      },
      {
        entry: "src/electron/preload.ts",
        vite: {
          build: {
            outDir: "dist-electron",
            sourcemap: true,
            rollupOptions: {
              external: ["electron"],
            },
            target: "esnext",
          },
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  base: "./",
});

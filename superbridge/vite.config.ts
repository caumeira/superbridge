import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: {
        preload: resolve(__dirname, "preload/index.ts"),
        main: resolve(__dirname, "main/index.ts"),
        client: resolve(__dirname, "client/index.ts"),
        shared: resolve(__dirname, "shared/index.ts"),
      },
      formats: ["es", "cjs"],
      // fileName: (format, entryName) => {
      //   const formatExt = format === "es" ? "js" : "cjs";
      //   return `${entryName}/index.${formatExt}`;
      // },
    },
    rollupOptions: {
      external: ["electron", "superjson"],
      output: {
        preserveModules: false,
      },
    },
  },
  plugins: [
    dts({
      include: ["preload", "main", "client", "shared"],
      exclude: ["**/*.test.ts", "**/*.spec.ts"],
      rollupTypes: false,
      outDir: "dist",
    }),
  ],
});

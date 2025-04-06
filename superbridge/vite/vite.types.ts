import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { resolve } from "path";

const bundles = ["main", "preload", "client", "shared"] as const;

export default defineConfig({
  plugins: [
    dts({
      include: bundles.map((bundle) => `${bundle}/**/*.ts`),
      exclude: ["**/*.test.ts", "**/*.spec.ts"],
      rollupTypes: false,
      copyDtsFiles: true,
      outDir: "dist",
      entryRoot: ".",
      compilerOptions: {
        preserveSymlinks: true,
        composite: false,
      },
    }),
  ],
});

import { UserConfig } from "vite";
import { readFileSync } from "fs";
import { resolve } from "path";

// Read package.json to get dependencies
const packageJson = JSON.parse(
  readFileSync(resolve(__dirname, "../package.json"), "utf-8")
);

// Get all dependencies and peerDependencies
const dependencies = Object.keys(packageJson.dependencies || {});
const peerDependencies = Object.keys(packageJson.peerDependencies || {});
const allExternalDeps = [...dependencies, ...peerDependencies];

export type BundleName = "main" | "preload" | "client" | "shared";

export function createBundleConfig(name: BundleName): UserConfig {
  return {
    build: {
      outDir: `dist/${name}`,
      sourcemap: true,
      minify: false,
      emptyOutDir: true,

      lib: {
        entry: resolve(__dirname, `../${name}/index.ts`),
        formats: ["es", "cjs"],
        fileName: (format) => `index.${format === "es" ? "js" : "cjs"}`,
      },

      rollupOptions: {
        external: allExternalDeps,
        output: {
          preserveModules: false,
        },
      },
    },

    define: {
      "process.env.NODE_ENV": JSON.stringify(
        process.env.NODE_ENV || "production"
      ),
    },
  };
}

import { BundleName } from "./utils";
import { execa } from "execa";

const bundles: BundleName[] = ["main", "preload", "client", "shared"];

async function buildAll() {
  console.log("Building all bundles...");

  try {
    // Build all bundles in parallel
    await Promise.all(
      bundles.map(async (bundle) => {
        console.log(`Building ${bundle} bundle...`);
        await execa("vite", ["build", "--config", `vite/vite.${bundle}.ts`], {
          stdio: "inherit",
        });
      })
    );

    // Generate type definitions
    console.log("Generating type definitions...");
    await execa("tsc", ["--emitDeclarationOnly"], {
      stdio: "inherit",
    });

    console.log("All bundles built successfully!");
  } catch (error) {
    console.error("Error building bundles:", error);
    process.exit(1);
  }
}

buildAll();

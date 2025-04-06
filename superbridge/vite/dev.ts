#!/usr/bin/env node

import { BundleName } from "./utils";
import { execa } from "execa";

const bundles: BundleName[] = ["main", "preload", "client", "shared"];

async function devAll() {
  console.log("Starting development mode for all bundles...");

  try {
    // Start all bundles in watch mode
    await Promise.all(
      bundles.map(async (bundle) => {
        console.log(`Starting ${bundle} bundle in watch mode...`);
        await execa(
          "vite",
          ["build", "--watch", "--config", `vite/vite.${bundle}.ts`],
          {
            stdio: "inherit",
          }
        );
      })
    );

    // Start type definitions generation in watch mode
    console.log("Starting type definitions generation in watch mode...");
    await execa("tsc", ["--emitDeclarationOnly", "--watch"], {
      stdio: "inherit",
    });
  } catch (error) {
    console.error("Error in development mode:", error);
    process.exit(1);
  }
}

devAll();

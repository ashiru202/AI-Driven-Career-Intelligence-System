import { access, cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build, context } from "esbuild";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const distDir = path.join(rootDir, "dist");
const watchMode = process.argv.includes("--watch");

const staticFiles = ["manifest.dist.json", "src/popup/popup.html", "src/popup/popup.css"];
const staticDirs = ["src/content/styles", "src/icons"];

async function pathExists(relativePath) {
  try {
    await access(path.join(rootDir, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function copyRelativePath(relativePath) {
  const source = path.join(rootDir, relativePath);
  const targetName = relativePath === "manifest.dist.json" ? "manifest.json" : relativePath;
  const target = path.join(distDir, targetName);
  await mkdir(path.dirname(target), { recursive: true });
  await cp(source, target, { recursive: true });
}

async function copyStaticAssets() {
  for (const file of staticFiles) {
    if (await pathExists(file)) {
      await copyRelativePath(file);
    }
  }

  for (const dir of staticDirs) {
    if (await pathExists(dir)) {
      await copyRelativePath(dir);
    }
  }
}

async function prepareDist() {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });
  await copyStaticAssets();
}

const baseBuildOptions = {
  absWorkingDir: rootDir,
  outbase: ".",
  outdir: "dist",
  bundle: true,
  target: ["chrome114"],
  sourcemap: true,
  logLevel: "info",
};

const moduleBuildOptions = {
  ...baseBuildOptions,
  entryPoints: ["src/background/background.js", "src/popup/popup.js"],
  format: "esm",
};

const contentScriptBuildOptions = {
  ...baseBuildOptions,
  entryPoints: ["src/content/content.js", "src/content/authBridge.js"],
  // Content scripts do not support native ESM in the manifest.
  // Bundle to a classic script format so we never ship `import` statements.
  format: "iife",
};

async function run() {
  await prepareDist();

  if (watchMode) {
    const ctxModule = await context(moduleBuildOptions);
    const ctxContent = await context(contentScriptBuildOptions);
    await Promise.all([ctxModule.watch(), ctxContent.watch()]);
    console.log("Watching extension sources. Press Ctrl+C to stop.");
    return;
  }

  await build(moduleBuildOptions);
  await build(contentScriptBuildOptions);
  console.log("Extension build complete.");
}

run().catch((error) => {
  console.error("Extension build failed:", error);
  process.exitCode = 1;
});

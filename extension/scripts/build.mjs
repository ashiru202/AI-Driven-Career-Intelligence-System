import { access, cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build, context } from "esbuild";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const distDir = path.join(rootDir, "dist");
const watchMode = process.argv.includes("--watch");

const staticFiles = ["manifest.json", "src/popup/popup.html", "src/popup/popup.css"];
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
  const target = path.join(distDir, relativePath);
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

const buildOptions = {
  absWorkingDir: rootDir,
  entryPoints: ["src/background/background.js", "src/content/content.js", "src/popup/popup.js"],
  outbase: ".",
  outdir: "dist",
  bundle: true,
  format: "esm",
  target: ["chrome114"],
  sourcemap: true,
  logLevel: "info",
};

async function run() {
  await prepareDist();

  if (watchMode) {
    const ctx = await context(buildOptions);
    await ctx.watch();
    console.log("Watching extension sources. Press Ctrl+C to stop.");
    return;
  }

  await build(buildOptions);
  console.log("Extension build complete.");
}

run().catch((error) => {
  console.error("Extension build failed:", error);
  process.exitCode = 1;
});

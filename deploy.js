import { createInterface } from "readline";
import { execSync }         from "child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "fs";
import { resolve }          from "path";

const rl = createInterface({ input: process.stdin, output: process.stdout });

rl.question("Enter destination folder path: ", (dest) => {
  rl.close();

  dest = dest.trim();
  if (!dest) {
    console.error("❌  No path entered. Aborting.");
    process.exit(1);
  }

  const destPath = resolve(dest);
  const distPath = resolve("dist");

  // ── 1. Build ────────────────────────────────────────────────────────────────
  console.log("\n🔨  Building...\n");
  try {
    execSync("npm run build", { stdio: "inherit" });
  } catch {
    console.error("\n❌  Build failed. Aborting copy.");
    process.exit(1);
  }

  // ── 2. Ensure destination exists ────────────────────────────────────────────
  if (!existsSync(destPath)) {
    mkdirSync(destPath, { recursive: true });
    console.log(`\n📁  Created folder: ${destPath}`);
  } else {
    // Clear existing contents so no stale files remain
    rmSync(destPath, { recursive: true, force: true });
    mkdirSync(destPath, { recursive: true });
    console.log(`\n🗑️   Cleared existing contents: ${destPath}`);
  }

  // ── 3. Copy dist → destination ───────────────────────────────────────────────
  console.log(`\n📦  Copying dist/ → ${destPath} ...`);
  try {
    cpSync(distPath, destPath, { recursive: true });
    console.log("✅  Done! Build copied successfully.\n");
  } catch (err) {
    console.error("❌  Copy failed:", err.message);
    process.exit(1);
  }
});

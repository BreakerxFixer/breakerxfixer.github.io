import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, "..");
const repoRoot = path.resolve(frontendDir, "..");
const distIndexPath = path.join(frontendDir, "dist", "index.html");

const targets = [
  "index.html",
  "ctf.html",
  "season0.html",
  "season1.html",
  "leaderboard.html",
  "learn.html",
  "writeups.html",
  "aboutus.html",
  "privacy.html"
];

const distHtml = readFileSync(distIndexPath, "utf8");
const scriptMatch = distHtml.match(/<script type="module" crossorigin src="([^"]+)"><\/script>/);
const styleMatch = distHtml.match(/<link rel="stylesheet" crossorigin href="([^"]+)">/);

if (!scriptMatch || !styleMatch) {
  throw new Error("No se pudieron extraer los assets compilados desde frontend/dist/index.html");
}

const jsAsset = `/frontend/dist${scriptMatch[1].replace(/^\/assets/, "/assets")}`;
const cssAsset = `/frontend/dist${styleMatch[1].replace(/^\/assets/, "/assets")}`;

for (const fileName of targets) {
  const targetPath = path.join(repoRoot, fileName);
  const current = readFileSync(targetPath, "utf8");
  const next = current
    .replace(/<script type="module" crossorigin src="[^"]+"><\/script>/, `<script type="module" crossorigin src="${jsAsset}"></script>`)
    .replace(/<link rel="stylesheet" crossorigin href="[^"]+">/, `<link rel="stylesheet" crossorigin href="${cssAsset}">`);

  writeFileSync(targetPath, next, "utf8");
}

console.log("Root HTML files synchronized with latest Vite assets.");

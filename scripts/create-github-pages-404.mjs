import { access, copyFile } from "node:fs/promises";

const publicDir = ".output/public";
const shellPath = `${publicDir}/_shell.html`;
const indexPath = `${publicDir}/index.html`;
const fallbackPath = `${publicDir}/404.html`;

try {
  let sourcePath = null;

  try {
    await access(shellPath);
    sourcePath = shellPath;
  } catch {
    await access(indexPath);
    sourcePath = indexPath;
  }

  await copyFile(sourcePath, fallbackPath);
  console.log(`GitHub Pages SPA fallback: ${fallbackPath} criado a partir de ${sourcePath}.`);
} catch (error) {
  console.error("Falha ao criar o fallback 404 do GitHub Pages:", error);
  process.exit(1);
}

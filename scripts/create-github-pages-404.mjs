import { access, copyFile, mkdir } from "node:fs/promises";

const publicDir = ".output/public";
const shellPath = `${publicDir}/_shell.html`;
const indexPath = `${publicDir}/index.html`;
const fallbackPath = `${publicDir}/404.html`;
const faviconSource = "IMG/favicon.ico";
const faviconTarget = `${publicDir}/favicon.ico`;

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

  await access(faviconSource);
  await mkdir(publicDir, { recursive: true });
  await copyFile(faviconSource, faviconTarget);

  console.log(`GitHub Pages SPA fallback: ${fallbackPath} criado a partir de ${sourcePath}.`);
  console.log(`Favicon copiado para: ${faviconTarget}.`);
} catch (error) {
  console.error("Falha ao preparar os arquivos do GitHub Pages:", error);
  process.exit(1);
}

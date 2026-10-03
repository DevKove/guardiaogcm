import { copyFile } from "node:fs/promises";
import { access } from "node:fs/promises";

try {
  await access("dist/index.html");
  await copyFile("dist/index.html", "dist/404.html");
  console.log("GitHub Pages SPA fallback: dist/404.html criado.");
} catch (error) {
  console.error("Falha ao criar o fallback 404 do GitHub Pages:", error);
  process.exit(1);
}

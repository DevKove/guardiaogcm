// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // GitHub Pages is static hosting. SPA mode removes the runtime SSR requirement
    // and generates a client-side application shell.
    spa: {
      enabled: true,
      prerender: {
        outputPath: "/_shell.html",
      },
    },
    // Keep the existing server entry for compatibility with the current
    // Lovable/TanStack build pipeline. GitHub Pages will publish only the
    // static client output.
    server: { entry: "server" },
  },
  vite: {
    // GitHub Pages project sites are served below /<repository>/.
    base: "/guardiaogcm/",
    optimizeDeps: { include: ["recharts", "@radix-ui/react-dialog"] },
  },
});

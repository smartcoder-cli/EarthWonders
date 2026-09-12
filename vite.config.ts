import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    open: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
  },
  optimizeDeps: {
    include: [
      "three",
      "tellux",
      "postprocessing",
      "3d-tiles-renderer",
      "@takram/three-atmosphere",
      "@takram/three-clouds",
      "@takram/three-geospatial",
      "@takram/three-geospatial-effects",
    ],
  },
});

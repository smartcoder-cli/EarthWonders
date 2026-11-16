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
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/three/")) {
            return "vendor-three";
          }
          if (
            id.includes("node_modules/tellux/") ||
            id.includes("node_modules/3d-tiles-renderer/") ||
            id.includes("node_modules/@takram/") ||
            id.includes("node_modules/postprocessing/")
          ) {
            return "vendor-tellux";
          }
        },
      },
    },
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

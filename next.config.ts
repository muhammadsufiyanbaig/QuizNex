import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      "@mediapipe/face_mesh": "./src/stubs/mediapipe-face-mesh.js",
    },
  },
};

export default nextConfig;

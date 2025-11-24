import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  turbopack: {
    // Ensure the workspace root is this project, not the user home directory
    root: __dirname,
  },
};

export default nextConfig;

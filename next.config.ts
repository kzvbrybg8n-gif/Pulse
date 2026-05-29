import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Silence l'inférence ambiguë de workspace root (lockfile parent dans /Users/louissaure/).
  outputFileTracingRoot: path.resolve(__dirname),
};

export default nextConfig;

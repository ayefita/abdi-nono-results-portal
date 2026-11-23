import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  eslint: { ignoreDuringBuilds: true },
  output: process.env.BUILD_STANDALONE === "1" ? "standalone" : undefined,
  serverExternalPackages: ["bcryptjs", "pdfkit", "xlsx"],
  images: { unoptimized: true },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@txtruth/core", "@txtruth/testkit"],
};

export default nextConfig;

import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@attendease/auth",
    "@attendease/config",
    "@attendease/contracts",
    "@attendease/ui-web",
  ],
}

export default nextConfig

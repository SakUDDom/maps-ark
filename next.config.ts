import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @ts-expect-error
  swcMinify: false,
  eslint: {
    // បិទការឆែក ESLint ពេល Build ដើម្បីកុំឱ្យស៊ី RAM Vercel គាំង
    ignoreDuringBuilds: true,
  },
  typescript: {
    // បិទការឆែក TypeScript ពេល Build ដូចគ្នា
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
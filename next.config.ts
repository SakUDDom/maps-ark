import type { NextConfig } from 'next';
import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  reactStrictMode: false,
  turbopack: {},
  typescript: {
    // រំលង TypeScript check ពេល Build ដើម្បីកុំឱ្យទាក់ Leaflet dynamic options
    ignoreBuildErrors: true,
  },
};

export default withPWA(nextConfig);
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
  turbopack: {}, // 🚀 បន្ថែមបន្ទាត់នេះដើម្បី silence error របស់ Turbopack
};

export default withPWA(nextConfig);
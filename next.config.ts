
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_APP_URL: process.env.URL,
    NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
    NEXT_PUBLIC_2FA_ENABLED: process.env.NEXT_PUBLIC_2FA_ENABLED,
    NEXT_PUBLIC_AI_BUDGET_ALLOCATION_MIN_DAYS: process.env.AI_BUDGET_ALLOCATION_MIN_DAYS,
  }
};

export default nextConfig;

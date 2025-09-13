
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
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
          },
          {
              protocol: 'https',
              hostname: 'a.tile.openstreetmap.org',
              port: '',
              pathname: '/**',
          },
          {
              protocol: 'https',
              hostname: 'b.tile.openstreetmap.org',
              port: '',
              pathname: '/**',
          },
          {
              protocol: 'https',
              hostname: 'c.tile.openstreetmap.org',
              port: '',
              pathname: '/**',
          },
    ],
  },
 };

export default nextConfig;

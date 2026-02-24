import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'thecareaudit.com' }],
        destination: 'https://www.thecareaudit.com/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

import { fileURLToPath } from 'node:url';
import path from 'node:path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Silences the "multiple lockfiles" workspace-root warning -- this repo
  // intentionally has a root lockfile (wallet/deploy scripts) alongside
  // frontend's own.
  outputFileTracingRoot: path.dirname(fileURLToPath(import.meta.url)),
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${process.env.BACKEND_URL ?? 'http://localhost:4000'}/api/:path*` }];
  },
};

export default nextConfig;

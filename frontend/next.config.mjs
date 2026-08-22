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
  // The Midnight SDK packages used for browser-side circuit calls
  // (lib/contract.ts) assume a couple of Node globals -- Next's client
  // bundle doesn't polyfill Node core modules by default.
  webpack: (config, { isServer, webpack }) => {
    // @midnight-ntwrk/ledger-v8 and onchain-runtime-v3 ship WASM binaries;
    // webpack 5 needs this opted in explicitly.
    config.experiments = { ...config.experiments, asyncWebAssembly: true, layers: true };
    if (!isServer) {
      config.resolve.fallback = { ...config.resolve.fallback, buffer: 'buffer', crypto: false, stream: false };
      config.plugins.push(new webpack.ProvidePlugin({ Buffer: ['buffer', 'Buffer'] }));
      // See lib/isomorphic-ws-browser-shim.js.
      config.resolve.alias = { ...config.resolve.alias, 'isomorphic-ws': path.resolve('lib/isomorphic-ws-browser-shim.js') };
    }
    return config;
  },
};

export default nextConfig;

#!/usr/bin/env node
// Compiles contracts/hidden-order.compact via WSL2 (Compact has no native
// Windows build -- see contracts/README.md). Wraps the manual `wsl -d
// Ubuntu -e bash -lc "..."` command so it's a single npm script instead of
// something to copy-paste correctly every time.

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const toolchainVersion = process.env.COMPACT_TOOLCHAIN_VERSION ?? '0.31.1';

// Translate the Windows path into the WSL-visible /mnt/c/... equivalent.
const wslRoot = rootDir
  .replace(/\\/g, '/')
  .replace(/^([A-Za-z]):/, (_m, drive) => `/mnt/${drive.toLowerCase()}`);

const command = `cd ${wslRoot} && compact compile +${toolchainVersion} contracts/hidden-order.compact contracts/build`;

console.log(`Compiling via WSL2 (toolchain ${toolchainVersion})...`);
const result = spawnSync('wsl', ['-d', 'Ubuntu', '-e', 'bash', '-lc', command], {
  stdio: 'inherit',
});

if (result.status !== 0) {
  console.error('Compile failed.');
  process.exit(result.status ?? 1);
}
console.log('Compiled to contracts/build/.');

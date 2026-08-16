#!/usr/bin/env node
// Clears the local SQLite database so a demo can be re-run from a clean
// order book without redeploying the contract or regenerating the wallet.

import { existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dbDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'backend', 'data');

if (!existsSync(dbDir)) {
  console.log('No backend/data directory found -- nothing to reset.');
  process.exit(0);
}

try {
  rmSync(dbDir, { recursive: true, force: true });
} catch (err) {
  if (err.code === 'EPERM' || err.code === 'EBUSY') {
    console.error('Could not delete backend/data/ -- stop the backend server first, then retry.');
    process.exit(1);
  }
  throw err;
}
console.log('Cleared backend/data/ -- the next backend start will recreate an empty database.');

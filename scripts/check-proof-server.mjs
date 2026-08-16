#!/usr/bin/env node
// Quick health check for the local Docker proof server, since a stopped
// container is the single most common thing to trip up a demo restart
// (see README -- Docker Desktop restarts stop it too).

import * as cfg from '../backend/src/midnight/config.mjs';

async function main() {
  try {
    const res = await fetch(cfg.proofServerUrl, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      console.log(`Proof server healthy at ${cfg.proofServerUrl} (HTTP ${res.status}).`);
      return;
    }
    console.error(`Proof server responded with HTTP ${res.status} at ${cfg.proofServerUrl}.`);
    process.exitCode = 1;
  } catch (err) {
    console.error(`Proof server unreachable at ${cfg.proofServerUrl}: ${err.message}`);
    console.error('Try: docker start midnight-proof-server-1');
    process.exitCode = 1;
  }
}

main();

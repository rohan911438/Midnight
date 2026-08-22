#!/usr/bin/env node
// Diagnostic: does the Dust sub-wallet's *exact* sync (allowedGap = 0n,
// the SDK's own default via waitForSyncedState()) ever complete? Our
// wallet.mjs deliberately relaxed sync completeness with a large gap
// tolerance to work around a real bug where shielded/unshielded sync for a
// low-activity wallet never reports an exact match -- but that same
// tolerance might be masking a genuine, still-in-progress Dust generation
// sync, which would explain a stuck 0 balance days after a confirmed
// on-chain registration. This bypasses getWallet()'s gap-tolerant wait and
// drives the Dust sub-wallet's own strict sync directly.
import { getWallet } from '../backend/src/midnight/wallet.mjs';

async function main() {
  const { facade } = await getWallet();
  console.log('[diag] facade ready (gap-tolerant sync already satisfied). Now waiting on STRICT dust sync...');

  const start = Date.now();
  const TIMEOUT_MS = 4 * 60 * 1000;
  try {
    await Promise.race([
      facade.dust.waitForSyncedState(),
      new Promise((_, reject) => setTimeout(() => reject(new Error(`strict dust sync did not complete within ${TIMEOUT_MS}ms`)), TIMEOUT_MS)),
    ]);
    console.log(`[diag] STRICT dust sync completed in ${Date.now() - start}ms`);
  } catch (err) {
    console.log(`[diag] STRICT dust sync did NOT complete: ${err.message}`);
  }

  const state = await new Promise((resolve) => {
    const sub = facade.dust.state.subscribe((s) => {
      resolve(s);
      sub.unsubscribe();
    });
  });
  console.log('Dust total coins:', state.totalCoins.length);
  console.log('Dust available coins:', state.availableCoins.length);
  console.log('Dust balance now:', state.balance(new Date()));

  process.exit(0);
}

main().catch((err) => {
  console.error('diag-dust-strict-sync failed:', err);
  process.exit(1);
});

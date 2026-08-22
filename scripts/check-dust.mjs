#!/usr/bin/env node
// Diagnoses Dust (fee-token) availability: is the funded Night UTXO
// registered for Dust generation, and what's the current spendable balance.

import { getWallet } from '../backend/src/midnight/wallet.mjs';

function firstStateOf(observable) {
  return new Promise((resolve) => {
    const sub = observable.subscribe((s) => {
      resolve(s);
      sub.unsubscribe();
    });
  });
}

async function main() {
  const { facade } = await getWallet();
  // Read each sub-wallet's own .state directly -- facade.state()'s combined
  // observable was observed to yield a stale/default first value even for
  // the confirmed-funded unshielded wallet, so it's not trustworthy for a
  // one-shot read like this.
  const [unshieldedState, dustState] = await Promise.all([
    firstStateOf(facade.unshielded.state),
    firstStateOf(facade.dust.state),
  ]);

  console.log('Unshielded balances:', unshieldedState.balances);
  console.log('Unshielded available coins:', unshieldedState.availableCoins.length);
  console.log('');
  console.log('Dust total coins:', dustState.totalCoins.length);
  console.log('Dust available coins:', dustState.availableCoins.length);
  console.log('Dust pending coins:', dustState.pendingCoins.length);
  console.log('Dust balance now:', dustState.balance(new Date()));
  console.log('Dust coin details:', JSON.stringify(dustState.totalCoins, (_k, v) => typeof v === 'bigint' ? v.toString() : v, 2));

  process.exit(0);
}

main().catch((err) => {
  console.error('check-dust failed:', err);
  process.exit(1);
});

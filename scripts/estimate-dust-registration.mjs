#!/usr/bin/env node
// One-shot diagnostic: what does the wallet SDK think a Dust registration
// will cost right now, and how much retroactive Dust does it estimate this
// wallet's Night UTXO(s) have accrued? Used to debug BalanceCheckOverspend
// (node error 138) on scripts/register-dust.mjs -- see docs/troubleshooting.md.

import { getWallet } from '../backend/src/midnight/wallet.mjs';

function firstState(facade) {
  return new Promise((resolve) => {
    const sub = facade.state().subscribe((s) => {
      resolve(s);
      sub.unsubscribe();
    });
  });
}

async function main() {
  const { facade } = await getWallet();
  const state = await firstState(facade);
  const nightUtxos = state.unshielded.availableCoins;
  console.log(`Night UTXOs: ${nightUtxos.length}`);
  console.log(JSON.stringify(nightUtxos, (_k, v) => typeof v === 'bigint' ? v.toString() : v, 2));

  const estimate = await facade.estimateRegistration(nightUtxos);
  console.log('');
  console.log('Registration estimate:', JSON.stringify(estimate, (_k, v) => typeof v === 'bigint' ? v.toString() : v, 2));

  process.exit(0);
}

main().catch((err) => {
  console.error('estimate-dust-registration failed:', err);
  process.exit(1);
});

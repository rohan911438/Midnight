#!/usr/bin/env node
// Registers this wallet's Night UTXOs for Dust generation. Required once
// before any fee-paying transaction (including contract deploy) will work:
// Dust (the fee token) is only generated for Night UTXOs whose key has an
// entry in the network's Dust registration table, and a plain wallet-to-
// wallet Night transfer does not register the recipient. See
// docs/troubleshooting.md for the full diagnosis.
//
// This transaction is (by ledger design) self-funding: fees can be paid
// from the Dust the registering UTXOs "would have generated" had they
// already been registered, so it works even with zero current Dust.

import { getWallet, submitWithRetry } from '../backend/src/midnight/wallet.mjs';

function firstState(facade) {
  return new Promise((resolve) => {
    const sub = facade.state().subscribe((s) => {
      resolve(s);
      sub.unsubscribe();
    });
  });
}

async function main() {
  const { facade, unshieldedKeystore } = await getWallet();
  const state = await firstState(facade);

  const nightUtxos = state.unshielded.availableCoins;
  console.log(`Found ${nightUtxos.length} available Night UTxO(s) to register.`);
  if (nightUtxos.length === 0) {
    throw new Error('No available Night UTxOs to register -- has the funding transaction confirmed?');
  }

  const nightVerifyingKey = unshieldedKeystore.getPublicKey();
  const signDustRegistration = (payload) => unshieldedKeystore.signData(payload);

  console.log('Building Dust registration transaction...');
  const recipe = await facade.registerNightUtxosForDustGeneration(nightUtxos, nightVerifyingKey, signDustRegistration);

  console.log('Finalizing (proving + balancing)...');
  const finalizedTx = await facade.finalizeRecipe(recipe);

  console.log('Submitting...');
  const txId = await submitWithRetry(facade, finalizedTx);

  console.log('');
  console.log('Dust registration submitted.');
  console.log(`Tx id: ${txId}`);
  console.log('Dust generation is gradual (per Midnight docs, on the order of days) -- this only needs to run once.');

  process.exit(0);
}

main().catch((err) => {
  console.error('register-dust failed:', err);
  process.exit(1);
});

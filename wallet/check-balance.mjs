#!/usr/bin/env node
// Checks the preview wallet's Night balance without touching the Node RPC
// relay at all -- only the standalone UnshieldedWallet + indexer connection
// are needed for this, which sidesteps the wallet-sync issue documented in
// project memory (blockfrost-wallet-relay-crash / private-swap-deploy-blocker)
// that blocks the full WalletFacade used by scripts/deploy.mjs.

import { mnemonicToSeedSync } from '@scure/bip39';
import { HDWallet, Roles } from '@midnight-ntwrk/wallet-sdk-hd';
import { UnshieldedWallet, createKeystore, PublicKey } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import { NetworkId as NetworkIdNamespace } from '@midnight-ntwrk/wallet-sdk-abstractions';
import * as cfg from '../backend/src/midnight/config.mjs';

const NetworkId = NetworkIdNamespace.NetworkId;

async function main() {
  const { mnemonic, address } = cfg.loadWalletSecret();
  const seed = mnemonicToSeedSync(mnemonic);
  const hdResult = HDWallet.fromSeed(seed);
  if (hdResult.type !== 'seedOk') throw new Error('Failed to derive HD wallet');
  const hdWallet = hdResult.hdWallet;

  const derived = hdWallet.selectAccount(0).selectRole(Roles.NightExternal).deriveKeyAt(0);
  if (derived.type !== 'keyDerived') throw new Error('Failed to derive Night key');
  hdWallet.clear();

  const keystore = createKeystore(derived.key, cfg.networkId);
  const publicKey = PublicKey.fromKeyStore(keystore);

  console.log(`Checking balance for ${address} ...`);

  const wallet = UnshieldedWallet({
    networkId: cfg.networkId,
    indexerClientConnection: { indexerHttpUrl: cfg.indexerHttpUrl, indexerWsUrl: cfg.indexerWsUrl },
  }).startWithPublicKey(publicKey);

  await wallet.start();
  const state = await wallet.waitForSyncedState();

  console.log('Balances:');
  for (const [tokenType, amount] of Object.entries(state.balances)) {
    console.log(`  ${tokenType}: ${amount}`);
  }
  if (Object.keys(state.balances).length === 0) {
    console.log('  (no balances found yet -- funding tx may still be confirming)');
  }

  await wallet.stop();
}

main().catch((err) => {
  console.error('Balance check failed:', err);
  process.exitCode = 1;
});

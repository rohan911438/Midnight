// Generates a new Midnight wallet (24-word mnemonic + Night account #0 external address)
// for the "preview" network, using the same SDK primitives the deploy scripts will use
// later (wallet-sdk-hd for derivation, wallet-sdk-unshielded-wallet for address encoding).
//
// Usage: node wallet/generate-wallet.mjs
// Output: writes wallet/preview-wallet.secret.json (gitignored) and prints the address.

import { writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { generateMnemonicWords, joinMnemonicWords, HDWallet, Roles } from '@midnight-ntwrk/wallet-sdk-hd';
import { mnemonicToSeedSync } from '@scure/bip39';
import { createKeystore } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
// NOTE: '@midnight-ntwrk/wallet-sdk-abstractions' does `export * as NetworkId from './NetworkId.js'`,
// and NetworkId.js itself has a named export *also* called NetworkId — so the enum is nested one
// level deeper than it looks (NetworkId.NetworkId.Preview, not NetworkId.Preview).
import { NetworkId as NetworkIdNamespace } from '@midnight-ntwrk/wallet-sdk-abstractions';
const NetworkId = NetworkIdNamespace.NetworkId;

const outPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'preview-wallet.secret.json');

if (existsSync(outPath)) {
  console.error(`Refusing to overwrite existing wallet file: ${outPath}`);
  console.error('Delete it first if you really want to generate a new wallet.');
  process.exit(1);
}

const words = generateMnemonicWords();
const mnemonic = joinMnemonicWords(words);
const seed = mnemonicToSeedSync(mnemonic);

const hdResult = HDWallet.fromSeed(seed);
if (hdResult.type !== 'seedOk') {
  throw new Error(`Failed to derive HD wallet from seed: ${JSON.stringify(hdResult.error)}`);
}
const hdWallet = hdResult.hdWallet;

const account = hdWallet.selectAccount(0);
const roleKey = account.selectRole(Roles.NightExternal);
const derived = roleKey.deriveKeyAt(0);
if (derived.type !== 'keyDerived') {
  throw new Error('Key derivation out of bounds at index 0 — this should never happen for index 0.');
}

const keystore = createKeystore(derived.key, NetworkId.Preview);
const address = keystore.getBech32Address();

hdWallet.clear();

const record = {
  network: 'preview',
  derivation: "m/account'0/role'NightExternal(0)/index'0",
  mnemonic,
  address: address.toString(),
  createdAt: new Date().toISOString(),
  warning: 'TESTNET ONLY. Never reuse this mnemonic for real funds. Do not commit this file.',
};

writeFileSync(outPath, JSON.stringify(record, null, 2), { encoding: 'utf8', mode: 0o600 });

console.log('Wallet generated for Midnight PREVIEW network.');
console.log('');
console.log('Address (fund this one):');
console.log(address.toString());
console.log('');
console.log(`Full record (mnemonic included) written to: ${outPath}`);
console.log('This file is gitignored. Back up the mnemonic somewhere safe — it is the only way to recover funds.');

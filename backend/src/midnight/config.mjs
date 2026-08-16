import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import dotenv from 'dotenv';

export const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
dotenv.config({ path: path.join(rootDir, '.env') });

export const networkId = process.env.NETWORK_ID ?? 'preview';
export const indexerHttpUrl = process.env.MIDNIGHT_INDEXER_HTTP;
export const indexerWsUrl = process.env.MIDNIGHT_INDEXER_WS;
export const relayUrl = process.env.MIDNIGHT_RPC;
export const proofServerUrl = process.env.PROOF_SERVER_URL ?? 'http://localhost:6300';
export const contractBuildDir = path.join(rootDir, 'contracts', 'build');
export const walletSeedFile = path.join(rootDir, process.env.WALLET_SEED_FILE ?? './wallet/preview-wallet.secret.json');
export const envFile = path.join(rootDir, '.env');
export const privateStateId = 'hiddenOrderContract';
export const contractTag = 'hidden-order';

export function loadWalletSecret() {
  return JSON.parse(readFileSync(walletSeedFile, 'utf8'));
}

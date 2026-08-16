const BASE = process.env.BLOCKSCOUT_URL ?? 'https://explorer.preview.midnight.network';

export function blockscoutTxUrl(txHash) {
  if (!txHash) return null;
  return `${BASE}/tx/${txHash}`;
}

export function blockscoutAddressUrl(address) {
  if (!address) return null;
  return `${BASE}/address/${address}`;
}

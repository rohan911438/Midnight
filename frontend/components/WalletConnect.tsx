'use client';

import { useState } from 'react';
import { connectLaceWallet, hasInjectedWallet, isValidPreviewAddress } from '@/lib/wallet';

export function WalletConnect({
  address,
  onConnect,
  onDisconnect,
}: {
  address: string | null;
  onConnect: (addr: string) => void;
  onDisconnect: () => void;
}) {
  const [manual, setManual] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    setConnecting(true);
    setError(null);
    try {
      const addr = await connectLaceWallet();
      if (addr) {
        onConnect(addr);
      } else {
        setError('No Lace wallet extension detected — enter a preview-network address manually below.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect wallet');
    } finally {
      setConnecting(false);
    }
  }

  if (address) {
    return (
      <div className="card">
        <p className="card-title">Wallet</p>
        <p className="hash">{address}</p>
        <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={onDisconnect}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <p className="card-title">Wallet</p>
      {error && <div className="error-banner">{error}</div>}
      <button className="btn" onClick={handleConnect} disabled={connecting}>
        {connecting ? 'Connecting…' : hasInjectedWallet() ? 'Connect Lace Wallet' : 'Connect Wallet'}
      </button>
      <div className="field" style={{ marginTop: 16 }}>
        <label>or paste a preview address</label>
        <input
          placeholder="mn_addr_preview1..."
          value={manual}
          onChange={(e) => setManual(e.target.value)}
        />
        {manual && !isValidPreviewAddress(manual) && (
          <span style={{ fontSize: 12, color: 'var(--sell)' }}>
            Doesn&apos;t look like a preview address (expected mn_addr_preview1...)
          </span>
        )}
      </div>
      <button
        className="btn btn-secondary"
        disabled={!isValidPreviewAddress(manual)}
        onClick={() => onConnect(manual.trim())}
      >
        Use this address
      </button>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { connectLaceWallet, hasInjectedWallet } from '@/lib/wallet';

export function WalletConnect({ address, onConnect }: { address: string | null; onConnect: (addr: string) => void }) {
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
      </div>
      <button className="btn btn-secondary" disabled={!manual} onClick={() => onConnect(manual)}>
        Use this address
      </button>
    </div>
  );
}

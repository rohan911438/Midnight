'use client';

import { useState } from 'react';
import { connectLaceWallet, hasInjectedWallet, isValidPreviewAddress, isWalletConnected } from '@/lib/wallet';

function truncate(address: string): string {
  return address.length > 24 ? `${address.slice(0, 14)}…${address.slice(-8)}` : address;
}

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
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

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
        <p className="card-title">
          Wallet
          {isWalletConnected() && <span className="side-tag BUY">LACE</span>}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span className="hash" title={address}>{truncate(address)}</span>
          <button className="copy-btn" onClick={handleCopy} title="Copy full address">
            {copied ? 'copied ✓' : 'copy'}
          </button>
        </div>
        {isWalletConnected() && (
          <p className="muted" style={{ marginTop: 10 }}>
            Circuit proving and signing happen in this browser, through Lace — not on the backend.
          </p>
        )}
        <button className="btn btn-secondary" style={{ marginTop: 14 }} onClick={onDisconnect}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <p className="card-title">Wallet</p>
      <p className="card-subtitle">
        {hasInjectedWallet()
          ? 'Connect Lace to prove and sign orders yourself, right in this browser.'
          : "No Lace extension detected — you can still explore the demo with a manually entered address, or install Lace for the full private, browser-side flow."}
      </p>
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

'use client';

import { useState } from 'react';
import { api, type Order } from '@/lib/api';

export function SwapForm({ walletAddress, onSubmitted }: { walletAddress: string; onSubmitted: (order: Order) => void }) {
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [amount, setAmount] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const order = await api.submitOrder({
        walletAddress,
        side,
        tokenPair: 'tDUST/tNIGHT',
        amount,
        limitPrice,
      });
      onSubmitted(order);
      setAmount('');
      setLimitPrice('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit order');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <p className="card-title">Submit hidden order</p>
      {error && <div className="error-banner">{error}</div>}

      <div className="side-toggle">
        <button type="button" className={side === 'BUY' ? 'active buy' : ''} onClick={() => setSide('BUY')}>
          Buy
        </button>
        <button type="button" className={side === 'SELL' ? 'active sell' : ''} onClick={() => setSide('SELL')}>
          Sell
        </button>
      </div>

      <div className="field">
        <label>Token pair</label>
        <input value="tDUST / tNIGHT" disabled />
      </div>

      <div className="field">
        <label>Amount (private)</label>
        <input
          type="number"
          min="1"
          placeholder="100"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>

      <div className="field">
        <label>Limit price (private)</label>
        <input
          type="number"
          min="1"
          placeholder="42"
          value={limitPrice}
          onChange={(e) => setLimitPrice(e.target.value)}
          required
        />
      </div>

      <button className="btn" type="submit" disabled={submitting}>
        {submitting ? 'Committing on-chain…' : 'Commit hidden order'}
      </button>
      <p className="muted" style={{ marginTop: 12 }}>
        Amount and limit price never leave this circuit as plaintext — only a commitment hash is written to the
        Midnight ledger.
      </p>
    </form>
  );
}

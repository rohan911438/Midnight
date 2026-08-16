'use client';

import { useState } from 'react';
import { api, type MatchRecord } from '@/lib/api';

export function MatchPanel({
  buyOrderId,
  sellOrderId,
  onMatched,
}: {
  buyOrderId: string | null;
  sellOrderId: string | null;
  onMatched: (match: MatchRecord) => void;
}) {
  const [matching, setMatching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMatch() {
    if (!buyOrderId || !sellOrderId) return;
    setMatching(true);
    setError(null);
    try {
      const match = await api.matchOrders(buyOrderId, sellOrderId);
      onMatched(match);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Match failed');
    } finally {
      setMatching(false);
    }
  }

  return (
    <div className="card">
      <p className="card-title">Match now</p>
      {error && <div className="error-banner">{error}</div>}
      <p className="muted" style={{ marginBottom: 16 }}>
        Pick one committed buy order and one committed sell order above, then trigger the match. Price compatibility
        is proven on-chain without revealing either side&apos;s amount or limit price.
      </p>
      <button className="btn" disabled={!buyOrderId || !sellOrderId || matching} onClick={handleMatch}>
        {matching ? 'Proving match…' : 'Match selected orders'}
      </button>
    </div>
  );
}

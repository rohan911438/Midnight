'use client';

import { useState } from 'react';
import { api, type MatchRecord } from '@/lib/api';

export function BeforeAfterPanel({ match, onSettled }: { match: MatchRecord | null; onSettled: (m: MatchRecord) => void }) {
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [settling, setSettling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!match) {
    return (
      <div className="card">
        <p className="card-title">Before / after</p>
        <div className="empty-state">
          <div className="empty-icon">⇄</div>
          <p className="muted">Match two orders above to see the hidden commitment next to the revealed settlement.</p>
        </div>
      </div>
    );
  }

  async function handleSettle() {
    setSettling(true);
    setError(null);
    try {
      const settled = await api.settleMatch(match!.id, amount, price);
      onSettled(settled);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Settlement failed');
    } finally {
      setSettling(false);
    }
  }

  const isSettled = match.status === 'SETTLED';

  return (
    <div className="card">
      <p className="card-title">Before / after — the reveal</p>
      {error && <div className="error-banner">{error}</div>}

      <div className="compare-grid">
        <div className="compare-col hidden-col">
          <h4>Hidden commitment</h4>
          <div className="sub">what&apos;s visible on-chain before settlement</div>
          <div className="kv">
            <span className="k">buy order</span>
            <span className="v">{match.buy_order_id.slice(0, 14)}…</span>
          </div>
          <div className="kv">
            <span className="k">sell order</span>
            <span className="v">{match.sell_order_id.slice(0, 14)}…</span>
          </div>
          <div className="kv">
            <span className="k">amount</span>
            <span className="v blurred">██████</span>
          </div>
          <div className="kv">
            <span className="k">price</span>
            <span className="v blurred">██████</span>
          </div>
          {match.matchTxUrl && (
            <a href={match.matchTxUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
              view match tx ↗
            </a>
          )}
        </div>

        <div className={`compare-col ${isSettled ? 'revealed-col' : 'hidden-col'}`}>
          <h4>{isSettled ? 'Revealed settlement' : 'Settle to reveal'}</h4>
          <div className="sub">
            {isSettled ? 'only the executed trade is public — original order terms never were' : 'enter the agreed trade terms'}
          </div>

          {isSettled ? (
            <>
              <div className="kv">
                <span className="k">executed amount</span>
                <span className="v">{match.revealed_amount}</span>
              </div>
              <div className="kv">
                <span className="k">executed price</span>
                <span className="v">{match.revealed_price}</span>
              </div>
              {match.settlementTxUrl && (
                <a href={match.settlementTxUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                  view settlement tx ↗
                </a>
              )}
            </>
          ) : (
            <>
              <div className="field">
                <label>Executed amount</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100" />
              </div>
              <div className="field">
                <label>Executed price</label>
                <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="40" />
              </div>
              <button className="btn" disabled={!amount || !price || settling} onClick={handleSettle}>
                {settling ? 'Proving settlement…' : 'Settle & reveal trade'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

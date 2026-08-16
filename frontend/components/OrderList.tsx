'use client';

import type { Order } from '@/lib/api';

export function OrderList({
  orders,
  loading,
  selectedBuyId,
  selectedSellId,
  onSelectBuy,
  onSelectSell,
}: {
  orders: Order[];
  loading: boolean;
  selectedBuyId: string | null;
  selectedSellId: string | null;
  onSelectBuy: (id: string) => void;
  onSelectSell: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="card">
        <p className="card-title">Order book (hidden)</p>
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="card">
        <p className="card-title">Order book (hidden)</p>
        <p className="muted">No orders committed yet. Submit one above to see it appear here, still hidden.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <p className="card-title">Order book (hidden)</p>
      {orders.map((order) => (
        <div className="order-row" key={order.id}>
          <div>
            <span className={`status-badge ${order.status}`}>{order.status}</span>
            <div className="hash" style={{ marginTop: 6 }}>
              {order.id.slice(0, 18)}… · commitment {order.commitment_hash.slice(0, 12)}…
            </div>
            {order.submitTxUrl && (
              <a href={order.submitTxUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                view commitment tx ↗
              </a>
            )}
          </div>
          {order.status === 'COMMITTED' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-secondary"
                style={{ width: 'auto', padding: '8px 14px', fontSize: 13 }}
                disabled={order.side !== 'BUY'}
                onClick={() => onSelectBuy(order.id)}
              >
                {selectedBuyId === order.id ? '✓ buy side' : 'pick as buy'}
              </button>
              <button
                className="btn btn-secondary"
                style={{ width: 'auto', padding: '8px 14px', fontSize: 13 }}
                disabled={order.side !== 'SELL'}
                onClick={() => onSelectSell(order.id)}
              >
                {selectedSellId === order.id ? '✓ sell side' : 'pick as sell'}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

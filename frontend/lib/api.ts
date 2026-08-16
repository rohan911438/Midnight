export type OrderStatus = 'PENDING' | 'COMMITTED' | 'MATCHED' | 'SETTLED' | 'FAILED';

export type Order = {
  id: string;
  wallet_address: string;
  side: 'BUY' | 'SELL';
  token_pair: string;
  commitment_hash: string;
  status: OrderStatus;
  submit_tx_hash: string | null;
  submitTxUrl: string | null;
  created_at: string;
  updated_at: string;
};

export type MatchRecord = {
  id: string;
  settlement_id: string | null;
  buy_order_id: string;
  sell_order_id: string;
  match_tx_hash: string | null;
  settlement_tx_hash: string | null;
  matchTxUrl: string | null;
  settlementTxUrl: string | null;
  revealed_amount: string | null;
  revealed_price: string | null;
  status: 'MATCHED' | 'SETTLED';
  created_at: string;
  settled_at: string | null;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  listOrders: () => request<Order[]>('/orders'),
  getOrder: (id: string) => request<Order>(`/orders/${id}`),
  submitOrder: (body: { walletAddress: string; side: 'BUY' | 'SELL'; tokenPair: string; amount: string; limitPrice: string }) =>
    request<Order>('/orders', { method: 'POST', body: JSON.stringify(body) }),
  listMatches: () => request<MatchRecord[]>('/matches'),
  matchOrders: (buyOrderId: string, sellOrderId: string) =>
    request<MatchRecord>('/matches', { method: 'POST', body: JSON.stringify({ buyOrderId, sellOrderId }) }),
  settleMatch: (matchId: string, executedAmount: string, executedPrice: string) =>
    request<MatchRecord>(`/matches/${matchId}/settle`, { method: 'POST', body: JSON.stringify({ executedAmount, executedPrice }) }),
};

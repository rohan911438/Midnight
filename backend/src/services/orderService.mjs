import { randomUUID } from 'node:crypto';
import db from '../db.mjs';
import * as contractClient from '../midnight/contractClient.mjs';
import { assertValidOrderSubmission, assertValidMatchPair, assertValidSettlement } from './validation.mjs';

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

// In-memory only, keyed by public order id -- never written to SQLite.
// Holds each open order's private terms (amount, limit price, local
// secret key) just long enough for this same backend process to build the
// matchOrders/settle proofs later. This is what "manual match trigger"
// means in this demo: a single backend, not a live matching engine, so
// holding both sides' terms in memory between submit and settle is safe
// and matches the "no raw order data persisted" requirement (persisted =
// written to disk).
const pendingSecrets = new Map();

export async function submitOrder({ walletAddress, side, tokenPair, amount, limitPrice }) {
  assertValidOrderSubmission({ walletAddress, side, amount, limitPrice });

  const secretKey = contractClient.randomSecretKey();
  const { orderId, commitment, txHash } = await contractClient.submitOrder({ side, amount, limitPrice, secretKey });

  pendingSecrets.set(orderId, { secretKey, amount, limitPrice, side });

  db.prepare(
    `INSERT INTO orders (id, wallet_address, side, token_pair, commitment_hash, status, submit_tx_hash)
     VALUES (?, ?, ?, ?, ?, 'COMMITTED', ?)`
  ).run(orderId, walletAddress, side, tokenPair ?? 'tDUST/tNIGHT', commitment, txHash);

  return getOrder(orderId);
}

export function getOrder(id) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!order) throw httpError(404, 'Order not found');
  return order;
}

export function listOrders() {
  return db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
}

export function getMatch(id) {
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(id);
  if (!match) throw httpError(404, 'Match not found');
  return match;
}

export function listMatches() {
  return db.prepare('SELECT * FROM matches ORDER BY created_at DESC').all();
}

export async function matchOrders({ buyOrderId, sellOrderId }) {
  const buy = pendingSecrets.get(buyOrderId);
  const sell = pendingSecrets.get(sellOrderId);
  assertValidMatchPair(buy, sell);

  const { txHash } = await contractClient.matchOrders({ buyOrderId, sellOrderId, buy, sell });

  db.prepare(
    `UPDATE orders SET status = 'MATCHED', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id IN (?, ?)`
  ).run(buyOrderId, sellOrderId);

  const matchId = randomUUID();
  db.prepare(
    `INSERT INTO matches (id, buy_order_id, sell_order_id, match_tx_hash, status) VALUES (?, ?, ?, ?, 'MATCHED')`
  ).run(matchId, buyOrderId, sellOrderId, txHash);

  return getMatch(matchId);
}

export async function settleMatch({ matchId, executedAmount, executedPrice }) {
  const match = getMatch(matchId);
  if (match.status !== 'MATCHED') throw httpError(400, 'Match already settled');

  const buy = pendingSecrets.get(match.buy_order_id);
  const sell = pendingSecrets.get(match.sell_order_id);
  if (!buy || !sell) throw httpError(500, 'Missing in-memory order terms for this match (server restarted?)');

  assertValidSettlement({ executedAmount, executedPrice, buy, sell });

  const { settlementId, txHash } = await contractClient.settle({
    buyOrderId: match.buy_order_id,
    sellOrderId: match.sell_order_id,
    buy,
    sell,
    executedAmount,
    executedPrice,
  });

  db.prepare(
    `UPDATE matches
     SET settlement_id = ?, status = 'SETTLED', settlement_tx_hash = ?, revealed_amount = ?, revealed_price = ?,
         settled_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
     WHERE id = ?`
  ).run(settlementId, txHash, String(executedAmount), String(executedPrice), matchId);

  db.prepare(`UPDATE orders SET status = 'SETTLED' WHERE id IN (?, ?)`).run(match.buy_order_id, match.sell_order_id);

  pendingSecrets.delete(match.buy_order_id);
  pendingSecrets.delete(match.sell_order_id);

  return getMatch(matchId);
}

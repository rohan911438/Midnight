import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';

// Exercises the same schema as src/db.mjs against an in-memory database,
// so these tests don't touch backend/data/ or need the real app wired up.
function freshDb() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE orders (
      id              TEXT PRIMARY KEY,
      wallet_address  TEXT NOT NULL,
      side            TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
      token_pair      TEXT NOT NULL,
      commitment_hash TEXT NOT NULL,
      status          TEXT NOT NULL CHECK (status IN ('PENDING', 'COMMITTED', 'MATCHED', 'SETTLED', 'FAILED')),
      submit_tx_hash  TEXT,
      created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE TABLE matches (
      id                  TEXT PRIMARY KEY,
      settlement_id       TEXT,
      buy_order_id        TEXT NOT NULL REFERENCES orders(id),
      sell_order_id       TEXT NOT NULL REFERENCES orders(id),
      match_tx_hash       TEXT,
      settlement_tx_hash  TEXT,
      revealed_amount     TEXT,
      revealed_price      TEXT,
      status              TEXT NOT NULL CHECK (status IN ('MATCHED', 'SETTLED')) DEFAULT 'MATCHED',
      created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      settled_at          TEXT
    );
  `);
  return db;
}

test('accepts a valid order row', () => {
  const db = freshDb();
  db.prepare(
    `INSERT INTO orders (id, wallet_address, side, token_pair, commitment_hash, status) VALUES (?, ?, ?, ?, ?, ?)`
  ).run('order-1', 'mn_addr_preview1x', 'BUY', 'tDUST/tNIGHT', 'abc123', 'COMMITTED');

  const row = db.prepare('SELECT * FROM orders WHERE id = ?').get('order-1');
  assert.equal(row.side, 'BUY');
  assert.equal(row.status, 'COMMITTED');
});

test('rejects an invalid side', () => {
  const db = freshDb();
  assert.throws(() => {
    db.prepare(
      `INSERT INTO orders (id, wallet_address, side, token_pair, commitment_hash, status) VALUES (?, ?, ?, ?, ?, ?)`
    ).run('order-1', 'mn_addr_preview1x', 'HOLD', 'tDUST/tNIGHT', 'abc123', 'COMMITTED');
  });
});

test('rejects an invalid order status', () => {
  const db = freshDb();
  assert.throws(() => {
    db.prepare(
      `INSERT INTO orders (id, wallet_address, side, token_pair, commitment_hash, status) VALUES (?, ?, ?, ?, ?, ?)`
    ).run('order-1', 'mn_addr_preview1x', 'BUY', 'tDUST/tNIGHT', 'abc123', 'CANCELLED');
  });
});

test('matches row references existing orders and defaults to MATCHED', () => {
  const db = freshDb();
  db.prepare(
    `INSERT INTO orders (id, wallet_address, side, token_pair, commitment_hash, status) VALUES (?, ?, 'BUY', 'p', 'c', 'MATCHED')`
  ).run('buy-1', 'addr');
  db.prepare(
    `INSERT INTO orders (id, wallet_address, side, token_pair, commitment_hash, status) VALUES (?, ?, 'SELL', 'p', 'c', 'MATCHED')`
  ).run('sell-1', 'addr');

  db.prepare(`INSERT INTO matches (id, buy_order_id, sell_order_id) VALUES (?, ?, ?)`).run('match-1', 'buy-1', 'sell-1');

  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get('match-1');
  assert.equal(match.status, 'MATCHED');
  assert.equal(match.revealed_amount, null);
});

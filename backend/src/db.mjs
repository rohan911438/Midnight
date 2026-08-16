// SQLite persistence for Private Swap. Only ever stores what is already
// public on-chain (order id, commitment hash, status, tx hashes, and the
// settlement's revealed amount/price) -- never the raw private amount or
// limit price of an open order.

// Uses Node's built-in node:sqlite (stable since Node 22.5) rather than
// better-sqlite3 -- this machine has no Visual Studio Build Tools, so
// better-sqlite3's native gyp build fails on install. node:sqlite needs no
// native compilation.
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { mkdirSync } from 'node:fs';

const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');
mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'private-swap.db'));
db.exec('PRAGMA journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id              TEXT PRIMARY KEY,       -- on-chain order id (public commitment id)
    wallet_address  TEXT NOT NULL,
    side            TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
    token_pair      TEXT NOT NULL,
    commitment_hash TEXT NOT NULL,          -- public commitment of amount+limitPrice, not the values themselves
    status          TEXT NOT NULL CHECK (status IN ('PENDING', 'COMMITTED', 'MATCHED', 'SETTLED', 'FAILED')),
    submit_tx_hash  TEXT,
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS matches (
    id                  TEXT PRIMARY KEY,   -- backend-local match id (from matchOrders trigger)
    settlement_id       TEXT,               -- on-chain settlement id, set once settle() runs
    buy_order_id        TEXT NOT NULL REFERENCES orders(id),
    sell_order_id       TEXT NOT NULL REFERENCES orders(id),
    match_tx_hash       TEXT,
    settlement_tx_hash  TEXT,
    revealed_amount     TEXT,               -- only populated post-settlement (public by then)
    revealed_price      TEXT,               -- only populated post-settlement (public by then)
    status              TEXT NOT NULL CHECK (status IN ('MATCHED', 'SETTLED')) DEFAULT 'MATCHED',
    created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    settled_at          TEXT
  );
`);

export default db;

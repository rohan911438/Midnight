# Architecture

```
┌──────────────┐      ┌───────────────────────┐      ┌──────────────────────┐
│   Frontend    │      │      Backend           │      │  SQLite (backend/data) │
│   (Next.js)   │◄────►│  Express + SQLite      │◄────►│  orders / matches      │
│   :3000       │ HTTP │  :4000                  │      │  (public data only)   │
└──────┬───────┘      └───────────┬───────────┘      └──────────────────────┘
       │                          │
       │ /api/* proxied           │ contractClient.mjs
       │ via next.config.mjs      ▼
       │                ┌───────────────────────┐
       │                │  midnight-js-contracts │
       │                │  (deployContract /     │
       │                │   findDeployedContract) │
       │                └──────────┬────────────┘
       │                           │
       │              ┌────────────┼────────────┐
       │              ▼            ▼             ▼
       │      ┌──────────────┐ ┌────────┐ ┌──────────────┐
       │      │ WalletFacade  │ │ Proof  │ │ Indexer      │
       │      │ (shielded +   │ │ server │ │ (Blockfrost  │
       │      │  unshielded + │ │ :6300  │ │  preview)    │
       │      │  Dust)        │ │ Docker │ │              │
       │      └──────┬───────┘ └────────┘ └──────────────┘
       │              │
       │              ▼
       │      ┌──────────────────────┐
       │      │  Midnight preview      │
       │      │  network                │
       │      │  (hidden-order.compact) │
       │      └──────────────────────┘
       │
       ▼
┌──────────────┐
│  Lace wallet   │  (optional -- falls back to manual address entry)
│  extension     │
└──────────────┘
```

## Why the private state provider is in-memory

`hidden-order.compact`'s witnesses (`orderAmount`, `localSecretKey`,
`matchBuyAmount`, etc.) are stateless per-call lookups -- each one just
reads whatever value the current circuit invocation needs off
`context.privateState`. There's no long-lived state to persist between
calls, so `backend/src/midnight/privateStateProvider.mjs` is a minimal
in-memory implementation of the SDK's `PrivateStateProvider` interface
rather than the LevelDB-backed one the SDK ships (which is built for a
persistent end-user wallet, encrypted with a user password -- overkill for
a short-lived demo backend process).

## Why order secrets live in server memory, not SQLite

`orderService.mjs` keeps each open order's private terms (amount, limit
price, local secret key) in an in-memory `Map`, keyed by order id, from
`submitOrder` until `settleMatch` deletes the entry. This is what makes the
"manual match trigger" demo flow possible: this backend, not a live
matching engine, needs those private terms again to build the
`matchOrders`/`settle` zero-knowledge proofs. They're never written to
SQLite -- only the public commitment hash, status, and (post-settlement)
revealed trade terms are.

## Data flow for one full order lifecycle

1. `POST /api/orders` → `contractClient.submitOrder` builds and submits a
   `submitOrder` circuit call. Only the resulting commitment hash and
   public side are written to SQLite; amount/limitPrice stay in the
   in-memory `Map`.
2. `POST /api/matches` → `contractClient.matchOrders` re-supplies both
   orders' private terms as witnesses so the circuit can verify their
   commitments and check price compatibility -- none of that leaves the
   proof.
3. `POST /api/matches/:id/settle` → `contractClient.settle` discloses only
   the agreed executed amount/price, bounded by both orders' original
   terms (enforced in-circuit), then the in-memory secrets for both orders
   are deleted.

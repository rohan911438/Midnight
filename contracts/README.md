# hidden-order.compact

The Private Swap contract: a front-running-resistant order book where amount
and limit price stay private until settlement.

## Circuits

- `submitOrder(side: Side): Bytes<32>` — commits a hidden order. `amount` and
  `limitPrice` are private witnesses; only a commitment hash and the public
  side (buy/sell) are written to ledger state. Returns the public order id.
- `matchOrders(buyOrderId, sellOrderId): []` — proves a committed buy and a
  committed sell order are price-compatible without disclosing either
  order's private terms. Only a `COMMITTED -> MATCHED` status transition
  becomes public.
- `settle(buyOrderId, sellOrderId): Bytes<32>` — discloses only the trade
  that actually executed (final amount + price), bounded by both orders'
  original private terms but never revealing those terms themselves.

## Ledger state (all public, by design none of it includes raw order terms)

- `orders: Map<Bytes<32>, OrderCommitment>` — commitment hash, owner key,
  side, status per order id.
- `settlements: Map<Bytes<32>, Settlement>` — revealed trade details per
  settlement id, only populated after `settle`.
- `orderSeq`, `settlementSeq: Counter`

## Compiling

Compact has no native Windows build — this repo compiles it through WSL2:

```bash
npm run compile-contract
```

which wraps (`scripts/compile-contract.mjs`):

```bash
wsl -d Ubuntu -e bash -lc "cd /mnt/c/Users/dell/Desktop/Midnight && compact compile +0.31.1 contracts/hidden-order.compact contracts/build"
```

Output goes to `contracts/build/` (committed to this repo so the compile
output can be verified without a WSL2 toolchain -- regenerate and commit
again after changing the contract): `contract/index.js` (the generated
JS/TS contract module used by the backend and deploy script, and by
`frontend/lib/contract.ts` for browser-side circuit calls), and `keys/` +
`zkir/` per circuit (prover key, verifier key, ZK IR) consumed by the local
proof server at `localhost:6300`, and copied into `frontend/public/` at
build time (`scripts/sync-frontend-zk-assets.mjs`) for the browser to fetch.

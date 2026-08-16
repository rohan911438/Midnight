# Private Swap — Midnight (preview network)

A front-running-resistant token swap built on Midnight's selective-disclosure
model. Swap orders (amount + limit price) stay hidden on-chain as a
zero-knowledge commitment until they're matched; only the trade that
actually executed is ever revealed.

## Why

Public order books leak intent the instant an order is submitted -- anyone
watching the mempool can front-run it. Here, `amount` and `limitPrice` are
private witness inputs to the `submitOrder` circuit; only a commitment hash
reaches the ledger. `matchOrders` proves two committed orders are
price-compatible without disclosing either side's terms. `settle` discloses
only the trade that actually executed.

## Layout

```
contracts/   hidden-order.compact -- submitOrder / matchOrders / settle circuits
backend/     Node/Express API + SQLite, orchestrates proof generation and tx submission
frontend/    Next.js swap UI: commit -> match -> settle -> before/after reveal
scripts/     deploy.mjs -- deploys the compiled contract to preview
wallet/      generate-wallet.mjs -- derives a preview-network signer
docs/        demo-script.md
```

## Running locally

```bash
# 1. Proof server (Docker)
docker start midnight-proof-server-1   # or: docker run -d -p 6300:6300 --name midnight-proof-server-1 midnightntwrk/proof-server:8.0.3

# 2. Compile the contract (Compact has no native Windows build -- via WSL2)
wsl -d Ubuntu -e bash -lc "cd /mnt/c/Users/dell/Desktop/Midnight && compact compile +0.31.1 contracts/hidden-order.compact contracts/build"

# 3. Deploy to preview
node scripts/deploy.mjs

# 4. Backend
npm run --prefix backend start

# 5. Frontend
npm run --prefix frontend dev
```

Config lives in `.env` (gitignored -- copy `.env.example` and fill in your own
Blockfrost preview project id). Network: **preview**. Scope, deliberately:
one matched order pair, test tokens only, no mainnet.

## Status

| Piece | Status |
|---|---|
| `hidden-order.compact` | Compiles cleanly, real prover/verifier keys generated for all 3 circuits (verified via WSL2, toolchain 0.31.1) |
| Preview wallet | Generated and funded (5000 tNight) |
| Local proof server | Running, healthy (`localhost:6300`) |
| Backend (Express + SQLite) | Boots, routes work, verified with curl |
| Frontend (Next.js) | Builds and typechecks cleanly, not yet exercised in a browser |
| Wallet balance check (`wallet/check-balance.mjs`) | **Works** -- confirms the funded 5000 tNight |
| `scripts/deploy.mjs` (full facade) | **Blocked** -- see [`docs/troubleshooting.md`](docs/troubleshooting.md) |

Two real, distinct SDK/config bugs were found and fixed along the way (a
broken Blockfrost RPC endpoint, and a completely unauthenticated indexer
subscription) -- both diagnosed with raw `ws` connectivity tests rather than
guessed, and both confirmed working for the read-only wallet path
(`wallet/check-balance.mjs`). The full deploy still hits one further,
undiagnosed sync issue. Full investigation, what's ruled out, and next
steps are in [`docs/troubleshooting.md`](docs/troubleshooting.md).
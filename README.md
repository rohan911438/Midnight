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
| Frontend (Next.js) | Complete, not yet exercised in a browser |
| `scripts/deploy.mjs` | **Blocked** -- wallet sync against the preview network hangs; not a bug in this repo's code, see below |

`scripts/deploy.mjs`'s `contractClient.mjs`/`wallet.mjs` are written and
verified against the actual installed `@midnight-ntwrk/midnight-js-contracts`
/ `wallet-sdk-facade` type signatures (not guessed) -- but running it hits a
live-network issue: Blockfrost's preview Node RPC closes the WebSocket
immediately (`1006 Abnormal Closure`); switching `MIDNIGHT_RPC` to
`wss://rpc.preview.midnight.network` (Midnight's own public node, verified
working via a raw `ws` connectivity test) fixes that but exposes a second,
different issue -- `facade.waitForSyncedState()` never resolves, looping on
`Wallet.Sync` errors after a normal-close `subscribeRuntimeVersion`
disconnect. Next steps: check for newer `wallet-sdk-facade`/`wallet-sdk-*`
versions, or try starting the shielded/unshielded/Dust sub-wallets one at a
time instead of concurrently via `WalletFacade.init`.
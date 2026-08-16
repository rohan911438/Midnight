# Troubleshooting: preview network deploy

`scripts/deploy.mjs` builds a full `WalletFacade` (shielded + unshielded +
Dust sub-wallets) via `@midnight-ntwrk/wallet-sdk-facade`, then deploys
`hidden-order.compact` through it. As of this writing that deploy is
**blocked** on a wallet-sync issue -- everything else in this repo (the
contract itself, the backend, the frontend, wallet generation, balance
checking) is built and verified working.

## Two real bugs found and fixed

**1. Blockfrost's preview Node RPC is broken as a wallet relay.**
`wss://rpc.midnight-preview.blockfrost.io` closes the WebSocket immediately
with `1006 Abnormal Closure` on every handshake attempt. Verified via a raw
`ws` connection test (no SDK involved) -- confirmed broken at the transport
level, not just slow.

**Fix:** point `MIDNIGHT_RPC` at Midnight's own public preview node instead:

```
MIDNIGHT_RPC=wss://rpc.preview.midnight.network
```

Verified this responds to `rpc_methods` in ~4.5s via the same raw `ws` test.

**2. The wallet SDK's indexer config has no auth field.** The
`IndexerClientConnection` type is just `{ indexerHttpUrl, indexerWsUrl,
keepAlive }` -- there's nowhere to put a Blockfrost `project_id`. Leaving it
off means every sync subscription connects successfully (the
`graphql-transport-ws` handshake and `connection_ack` both succeed, which is
what makes this easy to miss) but gets silently rejected once it actually
tries to subscribe, surfacing only as an opaque `Wallet.Sync: [object
ErrorEvent]` that retries forever.

**Fix:** embed the project id as a query parameter on *both* URLs:

```
MIDNIGHT_INDEXER_HTTP=https://midnight-preview.blockfrost.io/api/v0?project_id=<id>
MIDNIGHT_INDEXER_WS=wss://midnight-preview.blockfrost.io/api/v0/ws?project_id=<id>
```

**Confirmed fixed** for the standalone `UnshieldedWallet` path --
`node wallet/check-balance.mjs` resolves in under 2 seconds and correctly
reports the funded balance.

## What's still broken

With both fixes applied, `scripts/deploy.mjs`'s full `WalletFacade` gets
much further -- no more immediate failure -- but still eventually hits the
identical `Wallet.Sync: [object ErrorEvent]` from
`wallet-sdk-unshielded-wallet/dist/v1/Sync.js`, after anywhere from ~9 to
~18 minutes of otherwise-clean operation (timing varied between runs, which
points at something time/state-dependent rather than a deterministic config
error). `docker logs midnight-proof-server-1` confirms the proof server
never receives a single request in either case -- the failure is entirely
confined to the sync phase, before proving ever starts.

Ruled out: an indexer-connection idle timeout (`keepAlive: 15000` delayed
the failure from ~9 to ~18 minutes but didn't prevent it).

## Next steps for whoever picks this up

1. Instrument `wallet-sdk-unshielded-wallet`'s `Sync.js` locally (it's
   plain JS in `node_modules`, easy to add temporary logging around line 39)
   to see what the underlying `ErrorEvent` actually contains -- the SDK's
   own wrapping discards the useful detail.
2. Try running the full facade with Shielded and Dust stubbed out, to check
   whether Unshielded-alone survives longer inside a long-running process
   (as opposed to the short-lived `check-balance.mjs` script, which always
   succeeds).
3. Check for newer `@midnight-ntwrk/wallet-sdk-facade` / `wallet-sdk-*`
   versions -- this repo pins the current stable line (facade 4.0.1,
   unshielded-wallet 3.1.0, shielded 3.0.1, dust-wallet 4.1.0); a 5.x beta
   line exists and may include a fix, but wasn't tried here as it would
   also require bumping `midnight-js-contracts` off its stable 4.1.1 and
   re-verifying compatibility.
4. Search Midnight's Discord/forum/GitHub issues for `Wallet.Sync` +
   `ErrorEvent` -- the genericness of the error message suggests this may
   already be a known, reported issue.

Everything needed to resume is already wired up correctly: `contracts/`
compiles, `wallet/` has a funded signer, the local proof server is healthy,
and `backend/src/midnight/{config,wallet,contractClient}.mjs` are written
against the real, verified SDK type signatures -- this is a live-network
sync issue to debug, not application code to rewrite.

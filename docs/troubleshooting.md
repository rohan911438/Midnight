# Troubleshooting: preview network deploy

`scripts/deploy.mjs` builds a full `WalletFacade` (shielded + unshielded +
Dust sub-wallets) via `@midnight-ntwrk/wallet-sdk-facade`, then deploys
`hidden-order.compact` through it. As of this writing that deploy is
**blocked** -- everything else in this repo (the contract itself, the
backend, the frontend, wallet generation, balance checking) is built and
verified working; deploy is one command (`npm run deploy`) away from
succeeding the moment the blocker below clears.

## Current blocker (2026-08-23): Dust never generates for this wallet

Deploying (and any other fee-paying transaction) requires DUST, which is
generated automatically over time for NIGHT UTXOs registered via
`scripts/register-dust.mjs`. Full diagnosis:

1. **Registration genuinely succeeded on-chain.** `npm run check-dust`
   confirms the funded Night UTXO's own metadata says
   `registeredForDustGeneration: true` (registered 2026-08-17). An earlier
   session had wrongly concluded registration itself was failing, based on
   the specific tx hash `submitWithRetry` happened to log not being found
   by the indexer -- misleading, since `submitWithRetry` retries the whole
   build-and-submit cycle, so an *earlier* attempt's tx (not the logged
   one) is what actually landed.
2. **Per Midnight's own docs** (`docs.midnight.network/concepts/dust-architecture`),
   a registered NIGHT UTXO should generate DUST at ~827 billion Specks/sec
   per 100 NIGHT, reaching its 5-DUST-per-NIGHT cap in ~1 week. This wallet
   (5000 NIGHT, registered 6 days ago as of this writing) should be close to
   fully capped -- far more than enough to cover a deploy's fee.
3. **Actual balance is still exactly zero.** `npm run check-dust` reports
   `totalCoins: 0`, `balance: 0n`. Deploy fails with
   `Wallet.InsufficientFunds: Insufficient Funds: could not balance dust`
   (`[DIAG] InsufficientFunds: tokenType=dust needed=-1 availableCoins=[]`).
4. **Root cause narrowed to the Dust sub-wallet's sync, not our fee-balancing
   code.** `scripts/diag-dust-strict-sync.mjs` drives `facade.dust.waitForSyncedState()`
   with its default *exact* gap (not the tolerant `SYNC_GAP` this repo's
   `wallet.mjs` otherwise applies) directly, after the facade has already
   reached its gap-tolerant "synced" state. It never resolves (tested up to
   4 extra minutes) -- the Dust sub-wallet's sync against the preview
   indexer never converges, independent of our own gap-tolerance patch (so
   that patch is not masking this; exact sync doesn't complete either way).
   This points at either the Dust generation-tree subscription itself being
   broken against Blockfrost's preview indexer, or DUST generation not
   actually being processed server-side for this registration despite the
   UTXO being flagged as registered.

## Next steps for whoever picks this up

1. Re-run `npm run check-dust` periodically -- if this is purely a
   registration-processing delay rather than a broken subscription, balance
   should eventually appear.
2. Try `scripts/diag-dust-strict-sync.mjs` again with a longer timeout, and
   with `keepAlive` tuned on the indexer WS connection, to rule out a
   connection-level timeout rather than a genuine stuck sync.
3. File this with Midnight's SDK/forum (`forum.midnight.network`) --
   `Wallet.Sync: [object ErrorEvent]` recurs constantly in the background
   even after gap-tolerant "sync" is reached (see below), and the Dust
   sub-wallet specifically never reaches exact sync; this looks like a
   genuine upstream bug rather than anything fixable from application code.
4. Consider whether **preprod** (rather than preview) is the more actively
   supported network right now -- Midnight's own official
   `midnightntwrk/example-zkloan` reference dApp targets preprod, not
   preview, and its Lace-wallet gate explicitly tells users to switch to
   preprod. Preview may be a lower-priority/legacy network. Switching would
   mean a fresh wallet, a new preprod faucet request, and a new Blockfrost
   preprod project (or Midnight's own preprod indexer directly) -- a
   meaningful redo, not attempted here.

## Older, resolved issues

### Two real bugs found and fixed

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

### The `Wallet.Sync: [object ErrorEvent]` retry loop -- worked around

With both fixes above applied, the full `WalletFacade` used to eventually
hit `Wallet.Sync: [object ErrorEvent]` from each sub-wallet's `Sync.js`
after 9-18 minutes and never recover, because `facade.waitForSyncedState()`
requires an *exact* match (`allowedGap = 0n`) between each sub-wallet's
last-applied index and the indexer's current position -- a bar a
low-activity wallet's sync can effectively never clear, even though
diagnostic logging showed every subscription actually reaching the live
chain tip and just idling on real-time trickle after that.

**Fix (now in `backend/src/midnight/wallet.mjs`):** wait on each
sub-wallet's own `waitForSyncedState(gap)` with a generous gap tolerance
(`1_000_000n`) instead of the combined facade's exact-match wait. The
background `Wallet.Sync: [object ErrorEvent]` messages still print
constantly (harmless -- they're the same real-time-trickle retries as
before, just no longer gating "synced"), but `[wallet] synced.` now reliably
fires within seconds instead of never. This is what unblocked getting far
enough to hit the Dust-generation issue documented above.

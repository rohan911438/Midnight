# Private Swap — demo script

## Setup (before the room sees anything)

1. `docker start midnight-proof-server-1` then `npm run check-proof-server` to confirm it's healthy.
2. `npm run compile-contract` if the contract changed.
3. `npm run deploy` — deploys (or reuses, if `CONTRACT_ADDRESS` is already set in `.env`) `hidden-order.compact` on preview. Copy the printed contract address / deploy tx link. See `docs/troubleshooting.md` if this hangs.
4. `npm run backend` (port 4000).
5. `npm run frontend` (port 3000).
6. `npm run reset-demo` between run-throughs to clear the order book.

## The pitch (30 seconds)

Order books leak your intent the moment you submit a swap — anyone watching the mempool can front-run you. Private Swap commits your amount and limit price as a zero-knowledge witness: only a commitment hash goes on-chain. Matching proves price compatibility without revealing either side's numbers. Only the trade that actually executes becomes public — after the fact, when front-running is no longer possible.

## Live flow

1. **Connect wallet** — Lace if installed, otherwise paste the preview address.
2. **Submit two orders**: a BUY at a high-ish limit, a SELL at a lower limit, different browser tabs/wallets if you want to sell the "two traders" story.
3. Point at the order list: status `COMMITTED`, only a commitment hash shown, amount/price fields blurred in the UI.
4. Click through to Blockscout on the commit tx — show the transaction *does not contain* amount or price anywhere in its calldata/events.
5. **Match** the two orders — status flips to `MATCHED`. Still no amounts revealed anywhere, including on Blockscout.
6. **Settle** — enter the agreed executed amount/price (must sit inside both orders' limits; the contract enforces this in-circuit). Status flips to `SETTLED`.
7. Point at the before/after panel: hidden commitment on the left, revealed trade on the right, both linking to their own Blockscout tx. That contrast is the whole pitch in one screenshot.

## Anticipated questions

- **"Who runs the matching?"** — In this MVP, a manual trigger (this is explicitly out of scope to make continuous per the build brief); a real deployment would run this as a keeper/relayer service, still without ever seeing plaintext order terms beyond what's needed to construct the match proof for that one pair.
- **"Where's the money?"** — Test tokens only, target the preview network only; no real liquidity, explicitly out of scope for this MVP.
- **"Why does the backend need the raw amounts at all?"** — It needs them exactly long enough to build the `matchOrders`/`settle` zero-knowledge proofs (that's unavoidable — someone has to supply the witness). They're held in-memory only, never written to SQLite, and discarded the moment settlement completes.

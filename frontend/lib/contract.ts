// Browser-side circuit execution: builds the submitOrder proof and
// transaction inside the user's own browser session, signed and submitted
// through their connected Lace wallet -- not proxied through the backend.
// The backend's contractClient.mjs stays as the fallback path used only
// when no wallet is connected (see components/SwapForm.tsx), and remains
// the only path for matchOrders/settle, which need both sides' private
// order terms and so run as a keeper/operator step rather than an
// individual end-user action.
//
// Provider wiring mirrors the officially published reference for exactly
// this situation -- a browser dApp driving midnight-js-contracts through a
// connected Lace wallet -- in
// midnightntwrk/example-zkloan/zkloan-credit-scorer-ui/src/contexts/ZKLoanContext.tsx.
// The only differences from backend/src/midnight/contractClient.mjs are
// where each provider gets its config from: the wallet's own
// getConfiguration() (indexer/proof-server URIs) instead of .env, and
// FetchZkConfigProvider reading contracts/build/{keys,zkir} served from
// frontend/public/ (see scripts/sync-frontend-zk-assets.mjs) instead of
// NodeZkConfigProvider reading them off disk.
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { MidnightProvider, WalletProvider, PrivateStateProvider } from '@midnight-ntwrk/midnight-js-types';
import * as CompiledContractModule from '@midnight-ntwrk/compact-js/effect/CompiledContract';
import { Contract, Side, ledger as decodeLedger } from '../../contracts/build/contract/index.js';
import type { Witnesses } from '../../contracts/build/contract/index';
import { getConnectedWallet } from './wallet';

const NETWORK_ID = process.env.NEXT_PUBLIC_NETWORK_ID ?? 'preview';
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? '';
const PRIVATE_STATE_ID = 'hiddenOrderContract';
const CONTRACT_TAG = 'hidden-order';

type HiddenOrderCircuitId = 'submitOrder' | 'matchOrders' | 'settle';

type PrivateState = {
  secretKey?: Uint8Array;
  amount?: bigint;
  limitPrice?: bigint;
};

// Minimal in-memory PrivateStateProvider -- same shape and rationale as
// backend/src/midnight/privateStateProvider.mjs. This contract's witnesses
// are stateless (each closes over data supplied immediately before the
// circuit call below), so there's nothing that needs to survive a page
// reload.
function inMemoryPrivateStateProvider(): PrivateStateProvider<string, PrivateState> {
  const states = new Map<string, PrivateState>();
  const signingKeys = new Map<string, unknown>();
  return {
    setContractAddress: async () => {},
    set: async (id: string, state: PrivateState) => {
      states.set(id, state);
    },
    get: async (id: string) => states.get(id) ?? null,
    remove: async (id: string) => {
      states.delete(id);
    },
    clear: async () => {
      states.clear();
    },
    setSigningKey: async (address: string, key: unknown) => {
      signingKeys.set(address, key);
    },
    getSigningKey: async (address: string) => signingKeys.get(address) ?? null,
    removeSigningKey: async (address: string) => {
      signingKeys.delete(address);
    },
    clearSigningKeys: async () => {
      signingKeys.clear();
    },
    exportPrivateStates: async () => {
      throw new Error('exportPrivateStates is not supported by the in-memory private state provider');
    },
    importPrivateStates: async () => {
      throw new Error('importPrivateStates is not supported by the in-memory private state provider');
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const unreachable = (): never => {
  throw new Error('matchOrders/settle witnesses are not called from the browser client');
};

const witnesses: Witnesses<PrivateState> = {
  localSecretKey: (ctx) => [ctx.privateState, ctx.privateState.secretKey!],
  orderAmount: (ctx) => [ctx.privateState, ctx.privateState.amount!],
  orderLimitPrice: (ctx) => [ctx.privateState, ctx.privateState.limitPrice!],
  // matchOrders/settle witnesses aren't exercised from the browser -- only
  // submitOrder is -- but the Contract constructor requires the full
  // Witnesses<PS> shape.
  matchBuySecret: unreachable,
  matchBuyAmount: unreachable,
  matchBuyLimitPrice: unreachable,
  matchSellSecret: unreachable,
  matchSellAmount: unreachable,
  matchSellLimitPrice: unreachable,
  executedAmount: unreachable,
  executedPrice: unreachable,
};

function uint8ArrayToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToUint8Array(hex: string): Uint8Array {
  const matches = hex.replace(/^0x/, '').match(/.{1,2}/g) ?? [];
  return new Uint8Array(matches.map((b) => parseInt(b, 16)));
}

async function buildProviders() {
  const wallet = getConnectedWallet();
  if (!wallet) throw new Error('No connected wallet -- call connectLaceWallet() first');

  const config = await wallet.getConfiguration();
  if (!config.proverServerUri) throw new Error("Wallet configuration didn't include a proof server URI");

  setNetworkId(NETWORK_ID as Parameters<typeof setNetworkId>[0]);

  const zkConfigProvider = new FetchZkConfigProvider<HiddenOrderCircuitId>(window.location.origin, fetch.bind(window));
  const proofProvider = httpClientProofProvider(config.proverServerUri, zkConfigProvider);
  const publicDataProvider = indexerPublicDataProvider(config.indexerUri, config.indexerWsUri);

  const addresses = await wallet.getShieldedAddresses();
  if (!addresses.shieldedCoinPublicKey || !addresses.shieldedEncryptionPublicKey) {
    throw new Error('Wallet did not provide shielded coin/encryption public keys');
  }

  const walletProvider: WalletProvider = {
    getCoinPublicKey: () => addresses.shieldedCoinPublicKey as never,
    getEncryptionPublicKey: () => addresses.shieldedEncryptionPublicKey as never,
    balanceTx: async (tx: { serialize: () => Uint8Array }) => {
      const serializedHex = uint8ArrayToHex(tx.serialize());
      // The Lace extension's messaging layer appends a {sender} as a third
      // positional arg -- an options object must occupy the second slot
      // (even empty) for {sender} to land correctly. Confirmed against
      // midnightntwrk/example-zkloan's ZKLoanContext.tsx.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (wallet as any).balanceUnsealedTransaction(serializedHex, {});
      const { Transaction } = await import('@midnight-ntwrk/ledger-v8');
      return Transaction.deserialize('signature', 'proof', 'binding', hexToUint8Array(result.tx));
    },
  };

  const midnightProvider: MidnightProvider = {
    submitTx: async (tx: { serialize: () => Uint8Array }) => {
      const serializedHex = uint8ArrayToHex(tx.serialize());
      await wallet.submitTransaction(serializedHex);
      return serializedHex;
    },
  };

  return {
    privateStateProvider: inMemoryPrivateStateProvider(),
    publicDataProvider,
    zkConfigProvider,
    proofProvider,
    walletProvider,
    midnightProvider,
  };
}

const compiledContract = CompiledContractModule.make<InstanceType<typeof Contract<PrivateState>>>(CONTRACT_TAG, Contract).pipe(
  CompiledContractModule.withWitnesses(witnesses),
  CompiledContractModule.withCompiledFileAssets('/'),
);

export function randomSecretKey(): Uint8Array {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytes;
}

export async function submitOrderOnChain({
  side,
  amount,
  limitPrice,
  secretKey,
}: {
  side: 'BUY' | 'SELL';
  amount: bigint;
  limitPrice: bigint;
  secretKey: Uint8Array;
}) {
  if (!CONTRACT_ADDRESS) {
    throw new Error('NEXT_PUBLIC_CONTRACT_ADDRESS is not set -- deploy the contract first (scripts/deploy.mjs)');
  }

  const providers = await buildProviders();
  await providers.privateStateProvider.set(PRIVATE_STATE_ID, { secretKey, amount, limitPrice });

  const found = await findDeployedContract(providers, {
    compiledContract,
    contractAddress: CONTRACT_ADDRESS,
    privateStateId: PRIVATE_STATE_ID,
  });

  const result = await found.callTx.submitOrder(side === 'BUY' ? Side.BUY : Side.SELL);
  const orderIdBytes: Uint8Array = result.private.result;
  const ledgerState = decodeLedger(result.public.nextContractState);
  const orderRecord = ledgerState.orders.lookup(orderIdBytes);

  return {
    orderId: Buffer.from(orderIdBytes).toString('hex'),
    commitment: Buffer.from(orderRecord.commitment as Uint8Array).toString('hex'),
    txHash: result.public.txHash as string,
    secretKeyHex: Buffer.from(secretKey).toString('hex'),
  };
}

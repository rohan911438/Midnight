// Wires the compiled hidden-order contract up to real providers (proof
// server, preview indexer, wallet) via @midnight-ntwrk/midnight-js-contracts.
//
// Witness design: this contract's witnesses are stateless lookups into
// whatever the *current* circuit call needs -- there's no long-lived
// per-contract private state to track across calls, so each witness just
// reads its value off `context.privateState` and returns it unchanged.
// Callers (submitOrder/matchOrders/settle below) set that private state via
// `privateStateProvider.set(...)` immediately before invoking the circuit.
import { randomBytes } from 'node:crypto';
import { WebSocket } from 'ws';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import * as CompiledContractModule from '@midnight-ntwrk/compact-js/effect/CompiledContract';
import { Contract, Side, ledger as decodeLedger } from '../../../contracts/build/contract/index.js';
import { createInMemoryPrivateStateProvider } from './privateStateProvider.mjs';
import { getWallet, defaultTtl, submitWithRetry } from './wallet.mjs';
import * as cfg from './config.mjs';

// midnight-js-contracts reads this global rather than taking it as a
// parameter -- must be set before deployContract/findDeployedContract run.
setNetworkId(cfg.networkId);

const witnesses = {
  localSecretKey: (ctx) => [ctx.privateState, ctx.privateState.secretKey],
  orderAmount: (ctx) => [ctx.privateState, ctx.privateState.amount],
  orderLimitPrice: (ctx) => [ctx.privateState, ctx.privateState.limitPrice],
  matchBuySecret: (ctx) => [ctx.privateState, ctx.privateState.buySecret],
  matchBuyAmount: (ctx) => [ctx.privateState, ctx.privateState.buyAmount],
  matchBuyLimitPrice: (ctx) => [ctx.privateState, ctx.privateState.buyLimitPrice],
  matchSellSecret: (ctx) => [ctx.privateState, ctx.privateState.sellSecret],
  matchSellAmount: (ctx) => [ctx.privateState, ctx.privateState.sellAmount],
  matchSellLimitPrice: (ctx) => [ctx.privateState, ctx.privateState.sellLimitPrice],
  executedAmount: (ctx) => [ctx.privateState, ctx.privateState.executedAmount],
  executedPrice: (ctx) => [ctx.privateState, ctx.privateState.executedPrice],
};

let compiledContract = CompiledContractModule.make(cfg.contractTag, Contract);
compiledContract = CompiledContractModule.withWitnesses(compiledContract, witnesses);
compiledContract = CompiledContractModule.withCompiledFileAssets(compiledContract, cfg.contractBuildDir);

const privateStateProvider = createInMemoryPrivateStateProvider();

let providersPromise;
async function getProviders() {
  if (providersPromise) return providersPromise;
  providersPromise = (async () => {
    const { facade, shieldedSecretKeys, dustSecretKey } = await getWallet();

    const zkConfigProvider = new NodeZkConfigProvider(cfg.contractBuildDir);
    const publicDataProvider = indexerPublicDataProvider(cfg.indexerHttpUrl, cfg.indexerWsUrl, WebSocket);
    const proofProvider = httpClientProofProvider(cfg.proofServerUrl, zkConfigProvider);

    const walletProvider = {
      getCoinPublicKey: () => shieldedSecretKeys.coinPublicKey,
      getEncryptionPublicKey: () => shieldedSecretKeys.encryptionPublicKey,
      balanceTx: async (tx, ttl) => {
        const recipe = await facade.balanceUnboundTransaction(
          tx,
          { shieldedSecretKeys, dustSecretKey },
          { ttl: ttl ?? defaultTtl() }
        );
        return facade.finalizeRecipe(recipe);
      },
    };

    const midnightProvider = {
      submitTx: (tx) => submitWithRetry(facade, tx),
    };

    return { privateStateProvider, publicDataProvider, zkConfigProvider, proofProvider, walletProvider, midnightProvider };
  })();
  return providersPromise;
}

let foundContractPromise;
async function getContract() {
  if (foundContractPromise) return foundContractPromise;
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error('CONTRACT_ADDRESS is not set -- run scripts/deploy.mjs first');
  }
  const providers = await getProviders();
  foundContractPromise = findDeployedContract(providers, {
    compiledContract,
    contractAddress,
    privateStateId: cfg.privateStateId,
  });
  return foundContractPromise;
}

// Used only by scripts/deploy.mjs -- deploys a fresh instance of the contract.
export async function deploy() {
  const providers = await getProviders();
  const deployed = await deployContract(providers, {
    compiledContract,
    privateStateId: cfg.privateStateId,
    initialPrivateState: {},
  });
  return {
    contractAddress: deployed.deployTxData.public.contractAddress,
    txHash: deployed.deployTxData.public.txHash,
  };
}

export function randomSecretKey() {
  return new Uint8Array(randomBytes(32));
}

export async function submitOrder({ side, amount, limitPrice, secretKey }) {
  const found = await getContract();
  await privateStateProvider.set(cfg.privateStateId, { secretKey, amount, limitPrice });

  const result = await found.callTx.submitOrder(side === 'BUY' ? Side.BUY : Side.SELL);
  const orderIdBytes = result.private.result;
  const ledgerState = decodeLedger(result.public.nextContractState);
  const orderRecord = ledgerState.orders.lookup(orderIdBytes);

  return {
    orderId: Buffer.from(orderIdBytes).toString('hex'),
    commitment: Buffer.from(orderRecord.commitment).toString('hex'),
    txHash: result.public.txHash,
  };
}

export async function matchOrders({ buyOrderId, sellOrderId, buy, sell }) {
  const found = await getContract();
  await privateStateProvider.set(cfg.privateStateId, {
    buySecret: buy.secretKey,
    buyAmount: buy.amount,
    buyLimitPrice: buy.limitPrice,
    sellSecret: sell.secretKey,
    sellAmount: sell.amount,
    sellLimitPrice: sell.limitPrice,
  });

  const result = await found.callTx.matchOrders(Buffer.from(buyOrderId, 'hex'), Buffer.from(sellOrderId, 'hex'));
  return { txHash: result.public.txHash };
}

export async function settle({ buyOrderId, sellOrderId, buy, sell, executedAmount, executedPrice }) {
  const found = await getContract();
  await privateStateProvider.set(cfg.privateStateId, {
    buySecret: buy.secretKey,
    buyAmount: buy.amount,
    buyLimitPrice: buy.limitPrice,
    sellSecret: sell.secretKey,
    sellAmount: sell.amount,
    sellLimitPrice: sell.limitPrice,
    executedAmount,
    executedPrice,
  });

  const result = await found.callTx.settle(Buffer.from(buyOrderId, 'hex'), Buffer.from(sellOrderId, 'hex'));
  return {
    settlementId: Buffer.from(result.private.result).toString('hex'),
    txHash: result.public.txHash,
  };
}

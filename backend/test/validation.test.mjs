import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ValidationError,
  assertValidOrderSubmission,
  assertValidMatchPair,
  assertValidSettlement,
} from '../src/services/validation.mjs';

test('assertValidOrderSubmission accepts a well-formed order', () => {
  assert.doesNotThrow(() =>
    assertValidOrderSubmission({ walletAddress: 'mn_addr_preview1x', side: 'BUY', amount: 100n, limitPrice: 40n })
  );
});

test('assertValidOrderSubmission rejects a missing wallet address', () => {
  assert.throws(
    () => assertValidOrderSubmission({ walletAddress: '', side: 'BUY', amount: 100n, limitPrice: 40n }),
    ValidationError
  );
});

test('assertValidOrderSubmission rejects a bad side', () => {
  assert.throws(
    () => assertValidOrderSubmission({ walletAddress: 'mn_addr_preview1x', side: 'HOLD', amount: 100n, limitPrice: 40n }),
    ValidationError
  );
});

test('assertValidOrderSubmission rejects non-positive amount or price', () => {
  assert.throws(() =>
    assertValidOrderSubmission({ walletAddress: 'a', side: 'BUY', amount: 0n, limitPrice: 40n })
  );
  assert.throws(() =>
    assertValidOrderSubmission({ walletAddress: 'a', side: 'BUY', amount: 100n, limitPrice: 0n })
  );
});

test('assertValidMatchPair requires both orders present and correctly sided', () => {
  const buy = { side: 'BUY' };
  const sell = { side: 'SELL' };
  assert.doesNotThrow(() => assertValidMatchPair(buy, sell));
  assert.throws(() => assertValidMatchPair(undefined, sell), ValidationError);
  assert.throws(() => assertValidMatchPair(buy, undefined), ValidationError);
  assert.throws(() => assertValidMatchPair(sell, buy), ValidationError); // sides swapped
});

test('assertValidSettlement enforces bounds from both original orders', () => {
  const buy = { amount: 100n, limitPrice: 45n };
  const sell = { amount: 80n, limitPrice: 40n };

  assert.doesNotThrow(() => assertValidSettlement({ executedAmount: 80n, executedPrice: 42n, buy, sell }));

  // exceeds sell's size
  assert.throws(() => assertValidSettlement({ executedAmount: 90n, executedPrice: 42n, buy, sell }), ValidationError);
  // above buyer's limit
  assert.throws(() => assertValidSettlement({ executedAmount: 50n, executedPrice: 46n, buy, sell }), ValidationError);
  // below seller's limit
  assert.throws(() => assertValidSettlement({ executedAmount: 50n, executedPrice: 39n, buy, sell }), ValidationError);
  // non-positive amount
  assert.throws(() => assertValidSettlement({ executedAmount: 0n, executedPrice: 42n, buy, sell }), ValidationError);
});

// Pure validation helpers, kept separate from orderService's DB/contract
// orchestration so they're trivially unit-testable (see
// backend/test/validation.test.mjs).

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 400;
  }
}

export function assertValidOrderSubmission({ walletAddress, side, amount, limitPrice }) {
  if (!walletAddress) throw new ValidationError('walletAddress is required');
  if (side !== 'BUY' && side !== 'SELL') throw new ValidationError('side must be BUY or SELL');
  if (!(amount > 0)) throw new ValidationError('amount must be positive');
  if (!(limitPrice > 0)) throw new ValidationError('limitPrice must be positive');
}

export function assertValidMatchPair(buy, sell) {
  if (!buy || !sell) {
    throw new ValidationError(
      'Both orders must have been submitted in this backend session to be matched in this demo (their private terms live only in server memory, never on disk)'
    );
  }
  if (buy.side !== 'BUY' || sell.side !== 'SELL') {
    throw new ValidationError('buyOrderId must be a BUY order and sellOrderId must be a SELL order');
  }
}

export function assertValidSettlement({ executedAmount, executedPrice, buy, sell }) {
  if (!(executedAmount > 0) || executedAmount > buy.amount || executedAmount > sell.amount) {
    throw new ValidationError('executedAmount must be positive and not exceed either order size');
  }
  if (executedPrice > buy.limitPrice || executedPrice < sell.limitPrice) {
    throw new ValidationError("executedPrice must be within both orders' limit prices");
  }
}

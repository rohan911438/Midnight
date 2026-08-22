import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export enum Side { BUY = 0, SELL = 1 }

export enum OrderStatus { COMMITTED = 0, MATCHED = 1, SETTLED = 2 }

export type OrderCommitment = { commitment: Uint8Array;
                                owner: Uint8Array;
                                side: Side;
                                status: OrderStatus
                              };

export type Settlement = { buyOrderId: Uint8Array;
                           sellOrderId: Uint8Array;
                           executedAmount: bigint;
                           executedPrice: bigint;
                           settledAt: bigint
                         };

export type Witnesses<PS> = {
  localSecretKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  orderAmount(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  orderLimitPrice(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  matchBuySecret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  matchBuyAmount(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  matchBuyLimitPrice(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  matchSellSecret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  matchSellAmount(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  matchSellLimitPrice(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  executedAmount(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  executedPrice(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
}

export type ImpureCircuits<PS> = {
  submitOrder(context: __compactRuntime.CircuitContext<PS>, side_0: Side): __compactRuntime.CircuitResults<PS, Uint8Array>;
  matchOrders(context: __compactRuntime.CircuitContext<PS>,
              buyOrderId_0: Uint8Array,
              sellOrderId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  settle(context: __compactRuntime.CircuitContext<PS>,
         buyOrderId_0: Uint8Array,
         sellOrderId_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
}

export type ProvableCircuits<PS> = {
  submitOrder(context: __compactRuntime.CircuitContext<PS>, side_0: Side): __compactRuntime.CircuitResults<PS, Uint8Array>;
  matchOrders(context: __compactRuntime.CircuitContext<PS>,
              buyOrderId_0: Uint8Array,
              sellOrderId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  settle(context: __compactRuntime.CircuitContext<PS>,
         buyOrderId_0: Uint8Array,
         sellOrderId_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  submitOrder(context: __compactRuntime.CircuitContext<PS>, side_0: Side): __compactRuntime.CircuitResults<PS, Uint8Array>;
  matchOrders(context: __compactRuntime.CircuitContext<PS>,
              buyOrderId_0: Uint8Array,
              sellOrderId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  settle(context: __compactRuntime.CircuitContext<PS>,
         buyOrderId_0: Uint8Array,
         sellOrderId_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
}

export type Ledger = {
  orders: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): OrderCommitment;
    [Symbol.iterator](): Iterator<[Uint8Array, OrderCommitment]>
  };
  settlements: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Settlement;
    [Symbol.iterator](): Iterator<[Uint8Array, Settlement]>
  };
  readonly orderSeq: bigint;
  readonly settlementSeq: bigint;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;

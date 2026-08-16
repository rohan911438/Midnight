import { Router } from 'express';
import * as orderService from '../services/orderService.mjs';
import { blockscoutTxUrl } from '../services/blockscout.mjs';

const router = Router();

function withUrls(match) {
  return {
    ...match,
    matchTxUrl: blockscoutTxUrl(match.match_tx_hash),
    settlementTxUrl: blockscoutTxUrl(match.settlement_tx_hash),
  };
}

router.get('/', (_req, res) => {
  res.json(orderService.listMatches().map(withUrls));
});

router.get('/:id', (req, res) => {
  res.json(withUrls(orderService.getMatch(req.params.id)));
});

// Manual "match now" trigger for the demo -- pairs one committed buy order
// with one committed sell order and proves price-compatibility on-chain.
router.post('/', async (req, res, next) => {
  try {
    const { buyOrderId, sellOrderId } = req.body;
    const match = await orderService.matchOrders({ buyOrderId, sellOrderId });
    res.status(201).json(withUrls(match));
  } catch (err) {
    next(err);
  }
});

// Settles a matched pair, revealing only the executed amount/price.
router.post('/:id/settle', async (req, res, next) => {
  try {
    const { executedAmount, executedPrice } = req.body;
    const settled = await orderService.settleMatch({
      matchId: req.params.id,
      executedAmount: BigInt(executedAmount),
      executedPrice: BigInt(executedPrice),
    });
    res.json(withUrls(settled));
  } catch (err) {
    next(err);
  }
});

export default router;

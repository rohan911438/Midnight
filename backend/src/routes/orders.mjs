import { Router } from 'express';
import * as orderService from '../services/orderService.mjs';
import { blockscoutTxUrl } from '../services/blockscout.mjs';

const router = Router();

router.get('/', (_req, res) => {
  const orders = orderService.listOrders().map((o) => ({ ...o, submitTxUrl: blockscoutTxUrl(o.submit_tx_hash) }));
  res.json(orders);
});

router.get('/:id', (req, res) => {
  const order = orderService.getOrder(req.params.id);
  res.json({ ...order, submitTxUrl: blockscoutTxUrl(order.submit_tx_hash) });
});

router.post('/', async (req, res, next) => {
  try {
    const { walletAddress, side, tokenPair, amount, limitPrice } = req.body;
    const order = await orderService.submitOrder({
      walletAddress,
      side,
      tokenPair,
      amount: BigInt(amount),
      limitPrice: BigInt(limitPrice),
    });
    res.status(201).json({ ...order, submitTxUrl: blockscoutTxUrl(order.submit_tx_hash) });
  } catch (err) {
    next(err);
  }
});

export default router;

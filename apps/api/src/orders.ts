import { Router } from 'express';
import { requireAuth } from './auth.js';
import { allowRoles, type Actor } from './authorization.js';
import {
  draftInput,
  createDraft,
  editDraft,
  confirmOrder,
  fulfillOrder,
  cancelOrder,
} from './services/orders.js';
import { orderQuery } from './queries.js';
import { orderReport } from './services/reports.js';
import { getOrder } from './services/orders.js';
import { objectId } from './validation.js';
import { z } from 'zod';

export const ordersRouter = Router();
ordersRouter.use(requireAuth);
ordersRouter.post('/:id/cancel', allowRoles('admin', 'staff'), async (req, res) => {
  const input = z
    .object({ reason: z.string().trim().min(1).max(500) })
    .strict()
    .parse(req.body);
  res.json({
    data: await cancelOrder(
      objectId.parse(req.params['id']),
      input.reason,
      (res.locals['user'] as Actor).id,
    ),
  });
});
ordersRouter.post('/:id/fulfill', allowRoles('admin'), async (req, res) => {
  z.object({}).strict().parse(req.body);
  res.json({
    data: await fulfillOrder(objectId.parse(req.params['id']), (res.locals['user'] as Actor).id),
  });
});
ordersRouter.post('/:id/confirm', allowRoles('admin', 'staff'), async (req, res) => {
  z.object({}).strict().parse(req.body);
  res.json({
    data: await confirmOrder(objectId.parse(req.params['id']), (res.locals['user'] as Actor).id),
  });
});
ordersRouter.get('/', async (req, res) => res.json(await orderReport(orderQuery.parse(req.query))));
ordersRouter.patch('/:id', allowRoles('admin', 'staff'), async (req, res) =>
  res.json({
    data: await editDraft(
      objectId.parse(req.params['id']),
      draftInput.parse(req.body),
      (res.locals['user'] as Actor).id,
    ),
  }),
);
ordersRouter.post('/', allowRoles('admin', 'staff'), async (req, res) =>
  res.status(201).json({
    data: await createDraft(draftInput.parse(req.body), (res.locals['user'] as Actor).id),
  }),
);
ordersRouter.get('/:id', async (req, res) =>
  res.json({ data: await getOrder(objectId.parse(req.params['id'])) }),
);

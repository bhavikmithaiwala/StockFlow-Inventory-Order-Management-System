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
import { Order } from './models/order.js';
import { objectId } from './validation.js';
import { ApiError } from './errors.js';
import { z } from 'zod';
import { pagination } from './validation.js';

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
export const orderQuery = pagination
  .extend({
    status: z.enum(['draft', 'confirmed', 'fulfilled', 'cancelled']).optional(),
    search: z.string().trim().max(100).default(''),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
  })
  .strict()
  .refine((value) => !value.from || !value.to || value.from <= value.to);
ordersRouter.get('/', async (req, res) => {
  const query = orderQuery.parse(req.query);
  const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const filter = {
    ...(query.status ? { status: query.status } : {}),
    ...(escaped ? { orderNumber: { $regex: escaped, $options: 'i' } } : {}),
    ...(query.from || query.to
      ? {
          createdAt: {
            ...(query.from ? { $gte: new Date(`${query.from}T00:00:00.000Z`) } : {}),
            ...(query.to ? { $lte: new Date(`${query.to}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
  };
  const [data, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    Order.countDocuments(filter),
  ]);
  res.json({ data, meta: { page: query.page, limit: query.limit, total } });
});
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
ordersRouter.get('/:id', async (req, res) => {
  const order = await Order.findById(objectId.parse(req.params['id']))
    .populate('history.actorId', 'name')
    .lean();
  if (!order) throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found');
  res.json({ data: order });
});

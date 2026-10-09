import { Router } from 'express';
import { requireAuth } from './auth.js';
import { allowRoles, type Actor } from './authorization.js';
import { draftInput, createDraft } from './services/orders.js';
import { Order } from './models/order.js';
import { objectId } from './validation.js';
import { ApiError } from './errors.js';

export const ordersRouter = Router();
ordersRouter.use(requireAuth);
ordersRouter.post('/', allowRoles('admin', 'staff'), async (req, res) =>
  res
    .status(201)
    .json({
      data: await createDraft(draftInput.parse(req.body), (res.locals['user'] as Actor).id),
    }),
);
ordersRouter.get('/:id', async (req, res) => {
  const order = await Order.findById(objectId.parse(req.params['id'])).lean();
  if (!order) throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found');
  res.json({ data: order });
});

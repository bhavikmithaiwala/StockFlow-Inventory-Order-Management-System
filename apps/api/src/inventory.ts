import { Router } from 'express';
import { requireAuth } from './auth.js';
import { allowRoles, type Actor } from './authorization.js';
import { receiptInput, adjustmentInput, receiveStock, adjustStock } from './services/inventory.js';
import { z } from 'zod';
import { objectId, pagination } from './validation.js';
import { StockMovement } from './models/movement.js';

export const inventoryRouter = Router();
inventoryRouter.use(requireAuth);
export const movementQuery = pagination
  .extend({
    productId: objectId.optional(),
    type: z.enum(['receipt', 'adjustment', 'order-confirmed', 'order-cancelled']).optional(),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
  })
  .strict()
  .refine((value) => !value.from || !value.to || value.from <= value.to);
inventoryRouter.get('/movements', async (req, res) => {
  const query = movementQuery.parse(req.query);
  const filter = {
    ...(query.productId ? { productId: query.productId } : {}),
    ...(query.type ? { type: query.type } : {}),
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
    StockMovement.find(filter)
      .populate('productId', 'name skuNormalized')
      .populate('actorId', 'name')
      .sort({ createdAt: -1, _id: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    StockMovement.countDocuments(filter),
  ]);
  res.json({ data, meta: { page: query.page, limit: query.limit, total } });
});
inventoryRouter.post('/receive', allowRoles('admin', 'staff'), async (req, res) =>
  res.status(201).json({
    data: await receiveStock(receiptInput.parse(req.body), (res.locals['user'] as Actor).id),
  }),
);
inventoryRouter.post('/adjust', allowRoles('admin'), async (req, res) =>
  res.status(201).json({
    data: await adjustStock(adjustmentInput.parse(req.body), (res.locals['user'] as Actor).id),
  }),
);

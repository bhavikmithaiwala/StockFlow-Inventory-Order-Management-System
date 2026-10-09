import { Router } from 'express';
import { requireAuth } from './auth.js';
import { allowRoles, type Actor } from './authorization.js';
import { receiptInput, adjustmentInput, receiveStock, adjustStock } from './services/inventory.js';

export const inventoryRouter = Router();
inventoryRouter.use(requireAuth);
inventoryRouter.post('/receive', allowRoles('admin', 'staff'), async (req, res) =>
  res
    .status(201)
    .json({
      data: await receiveStock(receiptInput.parse(req.body), (res.locals['user'] as Actor).id),
    }),
);
inventoryRouter.post('/adjust', allowRoles('admin'), async (req, res) =>
  res
    .status(201)
    .json({
      data: await adjustStock(adjustmentInput.parse(req.body), (res.locals['user'] as Actor).id),
    }),
);

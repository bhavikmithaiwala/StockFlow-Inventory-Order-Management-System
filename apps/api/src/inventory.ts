import { Router } from 'express';
import { requireAuth } from './auth.js';
import { allowRoles, type Actor } from './authorization.js';
import {
  receiptInput,
  adjustmentInput,
  receiveStock,
  adjustStock,
  lowStock,
} from './services/inventory.js';
import { movementReport } from './services/reports.js';
import { movementQuery } from './queries.js';
import { pagination } from './validation.js';
export const inventoryRouter = Router();
inventoryRouter.use(requireAuth);
inventoryRouter.get('/low-stock', async (req, res) =>
  res.json(await lowStock(pagination.strict().parse(req.query))),
);
inventoryRouter.get('/movements', async (req, res) =>
  res.json(await movementReport(movementQuery.parse(req.query))),
);
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

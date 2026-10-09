import { Router } from 'express';
import { supplierInput } from './models/supplier.js';
import { requireAuth } from './auth.js';
import { allowRoles } from './authorization.js';
import { objectId, pagination } from './validation.js';
import { listSuppliers, createSupplier, editSupplier } from './services/catalog.js';
export const suppliersRouter = Router();
suppliersRouter.use(requireAuth);
suppliersRouter.get('/', async (req, res) =>
  res.json(await listSuppliers(pagination.strict().parse(req.query))),
);
suppliersRouter.post('/', allowRoles('admin'), async (req, res) =>
  res.status(201).json({ data: await createSupplier(supplierInput.parse(req.body)) }),
);
suppliersRouter.patch('/:id', allowRoles('admin'), async (req, res) =>
  res.json({
    data: await editSupplier(
      objectId.parse(req.params['id']),
      supplierInput
        .partial()
        .refine((value) => Object.keys(value).length > 0)
        .parse(req.body),
    ),
  }),
);

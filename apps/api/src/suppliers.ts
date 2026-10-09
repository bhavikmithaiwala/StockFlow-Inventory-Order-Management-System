import { Router } from 'express';
import { Supplier, supplierInput } from './models/supplier.js';
import { requireAuth } from './auth.js';
import { allowRoles } from './authorization.js';
import { objectId, pagination } from './validation.js';
import { ApiError } from './errors.js';

export const suppliersRouter = Router();
suppliersRouter.use(requireAuth);
suppliersRouter.get('/', async (req, res) => {
  const { page, limit } = pagination.strict().parse(req.query);
  const [data, total] = await Promise.all([
    Supplier.find()
      .sort({ name: 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Supplier.countDocuments(),
  ]);
  res.json({ data, meta: { page, limit, total } });
});
suppliersRouter.post('/', allowRoles('admin'), async (req, res) =>
  res.status(201).json({ data: await Supplier.create(supplierInput.parse(req.body)) }),
);
suppliersRouter.patch('/:id', allowRoles('admin'), async (req, res) => {
  const input = supplierInput
    .partial()
    .refine((value) => Object.keys(value).length > 0)
    .parse(req.body);
  const supplier = await Supplier.findByIdAndUpdate(objectId.parse(req.params['id']), input, {
    new: true,
    runValidators: true,
  });
  if (!supplier) throw new ApiError(404, 'SUPPLIER_NOT_FOUND', 'Supplier not found');
  res.json({ data: supplier });
});

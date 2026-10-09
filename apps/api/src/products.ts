import { Router } from 'express';
import { Product, productInput } from './models/product.js';
import { createProduct, editProduct } from './services/products.js';
import { requireAuth } from './auth.js';
import { allowRoles } from './authorization.js';
import { objectId } from './validation.js';
import { ApiError } from './errors.js';
import { z } from 'zod';
import { pagination } from './validation.js';
import type { FilterQuery, InferSchemaType } from 'mongoose';

export const productsRouter = Router();
productsRouter.use(requireAuth);
productsRouter.get('/', async (req, res) => {
  const query = pagination
    .extend({
      search: z.string().trim().max(100).default(''),
      categoryId: objectId.optional(),
      supplierId: objectId.optional(),
      active: z.enum(['true', 'false']).optional(),
      sort: z
        .enum(['name', 'skuNormalized', 'quantity', 'unitPriceCents', 'createdAt'])
        .default('name'),
      direction: z.enum(['asc', 'desc']).default('asc'),
    })
    .strict()
    .parse(req.query);
  const filter: FilterQuery<InferSchemaType<typeof Product.schema>> = {};
  if (query.categoryId) filter.categoryId = query.categoryId;
  if (query.supplierId) filter.supplierId = query.supplierId;
  if (query.active) filter.active = query.active === 'true';
  if (query.search) {
    const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { skuNormalized: { $regex: escaped, $options: 'i' } },
    ];
  }
  const [data, total] = await Promise.all([
    Product.find(filter)
      .sort({ [query.sort]: query.direction === 'asc' ? 1 : -1, _id: 1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    Product.countDocuments(filter),
  ]);
  res.json({ data, meta: { page: query.page, limit: query.limit, total } });
});
productsRouter.get('/:id', async (req, res) => {
  const product = await Product.findById(objectId.parse(req.params['id'])).lean();
  if (!product) throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
  res.json({ data: product });
});
productsRouter.post('/', allowRoles('admin'), async (req, res) =>
  res.status(201).json({ data: await createProduct(productInput.parse(req.body)) }),
);
productsRouter.patch('/:id', allowRoles('admin'), async (req, res) =>
  res.json({
    data: await editProduct(
      objectId.parse(req.params['id']),
      productInput
        .partial()
        .refine((input) => Object.keys(input).length > 0)
        .parse(req.body),
    ),
  }),
);
productsRouter.delete('/:id', allowRoles('admin'), async (req, res) => {
  const product = await Product.findByIdAndUpdate(
    objectId.parse(req.params['id']),
    { active: false },
    { new: true },
  );
  if (!product) throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
  res.json({ data: product });
});

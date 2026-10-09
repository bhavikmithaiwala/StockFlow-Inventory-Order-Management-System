import { Router } from 'express';
import { z } from 'zod';
import { productInput } from './models/product.js';
import {
  createProduct,
  editProduct,
  listProducts,
  getProduct,
  deactivateProduct,
} from './services/products.js';
import { requireAuth } from './auth.js';
import { allowRoles } from './authorization.js';
import { objectId } from './validation.js';
import { productQuery } from './queries.js';
export const productsRouter = Router();
productsRouter.use(requireAuth);
productsRouter.get('/', async (req, res) =>
  res.json(await listProducts(productQuery.parse(req.query))),
);
productsRouter.get('/:id', async (req, res) =>
  res.json({ data: await getProduct(objectId.parse(req.params['id'])) }),
);
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
  z.object({})
    .strict()
    .parse(req.body ?? {});
  res.json({ data: await deactivateProduct(objectId.parse(req.params['id'])) });
});

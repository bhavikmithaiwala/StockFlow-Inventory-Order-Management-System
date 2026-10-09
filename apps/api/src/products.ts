import { Router } from 'express';
import { Product, productInput } from './models/product.js';
import { createProduct, editProduct } from './services/products.js';
import { requireAuth } from './auth.js';
import { allowRoles } from './authorization.js';
import { objectId } from './validation.js';
import { ApiError } from './errors.js';

export const productsRouter = Router();
productsRouter.use(requireAuth);
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

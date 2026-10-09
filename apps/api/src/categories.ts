import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Category, categoryInput } from './models/category.js';
import { requireAuth } from './auth.js';
import { allowRoles } from './authorization.js';
import { ApiError } from './errors.js';
import { objectId, pagination } from './validation.js';
import { transaction } from './services/transaction.js';

export async function updateCategory(
  id: string,
  input: z.infer<ReturnType<typeof categoryInput.partial>>,
) {
  return transaction(async (session) => {
    const category = await Category.findByIdAndUpdate(
      id,
      { $inc: { __v: 1 } },
      { new: true, session },
    );
    if (!category) throw new ApiError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
    if (
      input.active === false &&
      (await mongoose.connection
        .collection('products')
        .countDocuments({ categoryId: category._id }, { session }))
    ) {
      throw new ApiError(409, 'CATEGORY_REFERENCED', 'Referenced categories cannot be deactivated');
    }
    Object.assign(category, input);
    return category.save({ session });
  });
}
export const categoriesRouter = Router();
categoriesRouter.use(requireAuth);
categoriesRouter.get('/', async (req, res) => {
  const { page, limit } = pagination.strict().parse(req.query);
  const [data, total] = await Promise.all([
    Category.find()
      .sort({ name: 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Category.countDocuments(),
  ]);
  res.json({ data, meta: { page, limit, total } });
});
categoriesRouter.post('/', allowRoles('admin'), async (req, res) => {
  res.status(201).json({ data: await Category.create(categoryInput.parse(req.body)) });
});
categoriesRouter.patch('/:id', allowRoles('admin'), async (req, res) => {
  const input = categoryInput
    .partial()
    .refine((value) => Object.keys(value).length > 0)
    .parse(req.body);
  res.json({ data: await updateCategory(objectId.parse(req.params['id']), input) });
});

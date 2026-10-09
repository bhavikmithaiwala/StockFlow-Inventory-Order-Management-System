import { Router } from 'express';
import { categoryInput } from './models/category.js';
import { requireAuth } from './auth.js';
import { allowRoles } from './authorization.js';
import { objectId, pagination } from './validation.js';
import { listCategories, createCategory, updateCategory } from './services/catalog.js';
export const categoriesRouter = Router();
categoriesRouter.use(requireAuth);
categoriesRouter.get('/', async (req, res) =>
  res.json(await listCategories(pagination.strict().parse(req.query))),
);
categoriesRouter.post('/', allowRoles('admin'), async (req, res) =>
  res.status(201).json({ data: await createCategory(categoryInput.parse(req.body)) }),
);
categoriesRouter.patch('/:id', allowRoles('admin'), async (req, res) =>
  res.json({
    data: await updateCategory(
      objectId.parse(req.params['id']),
      categoryInput
        .partial()
        .refine((value) => Object.keys(value).length > 0)
        .parse(req.body),
    ),
  }),
);

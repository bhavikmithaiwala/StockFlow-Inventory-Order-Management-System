import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from './auth.js';
import { allowRoles } from './authorization.js';
import { objectId, pagination } from './validation.js';
import { listUsers, createUser, editUser } from './services/catalog.js';
export const usersRouter = Router();
usersRouter.use(requireAuth, allowRoles('admin'));
usersRouter.get('/', async (req, res) =>
  res.json(await listUsers(pagination.strict().parse(req.query))),
);
usersRouter.post('/', async (req, res) =>
  res.status(201).json({
    data: await createUser(
      z
        .object({
          name: z.string().trim().min(1).max(100),
          email: z.email(),
          password: z.string().min(12).max(128),
          role: z.enum(['admin', 'staff']).default('staff'),
        })
        .strict()
        .parse(req.body),
    ),
  }),
);
usersRouter.patch('/:id', async (req, res) =>
  res.json({
    data: await editUser(
      objectId.parse(req.params['id']),
      z
        .object({
          name: z.string().trim().min(1).max(100).optional(),
          role: z.enum(['admin', 'staff']).optional(),
          active: z.boolean().optional(),
        })
        .strict()
        .refine((value) => Object.keys(value).length > 0)
        .parse(req.body),
    ),
  }),
);

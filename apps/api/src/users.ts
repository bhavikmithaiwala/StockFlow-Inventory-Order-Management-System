import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from './auth.js';
import { allowRoles } from './authorization.js';
import { User } from './models/user.js';
import { hashPassword } from './security/password.js';
import { objectId, pagination } from './validation.js';
import { ApiError } from './errors.js';

export const usersRouter = Router();
usersRouter.use(requireAuth, allowRoles('admin'));
usersRouter.get('/', async (req, res) => {
  const { page, limit } = pagination.strict().parse(req.query);
  const [data, total] = await Promise.all([
    User.find()
      .select('-__v')
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(),
  ]);
  res.json({ data, meta: { page, limit, total } });
});
usersRouter.post('/', async (req, res) => {
  const input = z
    .object({
      name: z.string().trim().min(1).max(100),
      email: z.email(),
      password: z.string().min(12).max(128),
      role: z.enum(['admin', 'staff']).default('staff'),
    })
    .strict()
    .parse(req.body);
  const user = await User.create({
    name: input.name,
    emailNormalized: input.email.toLowerCase(),
    passwordHash: await hashPassword(input.password),
    role: input.role,
  });
  res
    .status(201)
    .json({
      data: {
        _id: user.id,
        name: user.name,
        emailNormalized: user.emailNormalized,
        role: user.role,
        active: user.active,
      },
    });
});
usersRouter.patch('/:id', async (req, res) => {
  const id = objectId.parse(req.params['id']);
  const input = z
    .object({
      name: z.string().trim().min(1).max(100).optional(),
      role: z.enum(['admin', 'staff']).optional(),
      active: z.boolean().optional(),
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0)
    .parse(req.body);
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
  if (user.role === 'admin' && (input.active === false || input.role === 'staff'))
    throw new ApiError(
      409,
      'ADMIN_PROTECTED',
      'Administrator accounts cannot be deactivated or demoted in this version',
    );
  Object.assign(user, input);
  await user.save();
  res.json({ data: user });
});

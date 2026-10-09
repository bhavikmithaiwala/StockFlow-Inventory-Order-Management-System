import mongoose from 'mongoose';
import { z } from 'zod';
import { Category, categoryInput } from '../models/category.js';
import { Supplier, supplierInput } from '../models/supplier.js';
import { User } from '../models/user.js';
import { hashPassword } from '../security/password.js';
import { ApiError } from '../errors.js';
import { transaction } from './transaction.js';
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

export async function listCategories({ page, limit }: { page: number; limit: number }) {
  const [data, total] = await Promise.all([
    Category.find()
      .sort({ name: 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Category.countDocuments(),
  ]);
  return { data, meta: { page, limit, total } };
}
export const createCategory = (input: z.infer<typeof categoryInput>) => Category.create(input);
export async function listSuppliers({ page, limit }: { page: number; limit: number }) {
  const [data, total] = await Promise.all([
    Supplier.find()
      .sort({ name: 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Supplier.countDocuments(),
  ]);
  return { data, meta: { page, limit, total } };
}
export const createSupplier = (input: z.infer<typeof supplierInput>) => Supplier.create(input);
export async function editSupplier(
  id: string,
  input: z.infer<ReturnType<typeof supplierInput.partial>>,
) {
  const supplier = await Supplier.findByIdAndUpdate(id, input, { new: true, runValidators: true });
  if (!supplier) throw new ApiError(404, 'SUPPLIER_NOT_FOUND', 'Supplier not found');
  return supplier;
}
export async function listUsers({ page, limit }: { page: number; limit: number }) {
  const [data, total] = await Promise.all([
    User.find()
      .select('-__v')
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(),
  ]);
  return { data, meta: { page, limit, total } };
}
export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'staff';
}) {
  const user = await User.create({
    name: input.name,
    emailNormalized: input.email.toLowerCase(),
    passwordHash: await hashPassword(input.password),
    role: input.role,
  });
  return {
    _id: user.id,
    name: user.name,
    emailNormalized: user.emailNormalized,
    role: user.role,
    active: user.active,
  };
}
export async function editUser(
  id: string,
  input: { name?: string; role?: 'admin' | 'staff'; active?: boolean },
) {
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
  return user;
}
export async function updateProfile(
  id: string,
  input: { name: string; preferences: { pageSize: number } },
) {
  const user = await User.findByIdAndUpdate(id, input, { new: true, runValidators: true });
  if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
  return user;
}

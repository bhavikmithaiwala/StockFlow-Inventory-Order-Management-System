import mongoose, { type ClientSession } from 'mongoose';
import { z } from 'zod';
import { Product, productInput } from '../models/product.js';
import { Category } from '../models/category.js';
import { Supplier } from '../models/supplier.js';
import { ApiError } from '../errors.js';

async function references(categoryId: string, supplierId: string, session: ClientSession) {
  const category = await Category.updateOne(
    { _id: categoryId, active: true },
    { $inc: { __v: 1 } },
    { session },
  );
  const supplier = await Supplier.updateOne(
    { _id: supplierId, active: true },
    { $inc: { __v: 1 } },
    { session },
  );
  if (!category.matchedCount || !supplier.matchedCount)
    throw new ApiError(409, 'INACTIVE_REFERENCE', 'Choose an active category and supplier');
}
export async function createProduct(input: z.infer<typeof productInput>) {
  return mongoose.connection.transaction(async (session) => {
    await references(input.categoryId, input.supplierId, session);
    const { sku, ...fields } = input;
    const [product] = await Product.create([{ ...fields, skuNormalized: sku, quantity: 0 }], {
      session,
    });
    return product;
  });
}
export async function editProduct(
  id: string,
  input: z.infer<ReturnType<typeof productInput.partial>>,
) {
  return mongoose.connection.transaction(async (session) => {
    const product = await Product.findById(id).session(session);
    if (!product) throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
    await references(
      input.categoryId ?? product.categoryId.toString(),
      input.supplierId ?? product.supplierId.toString(),
      session,
    );
    const { sku, ...fields } = input;
    Object.assign(product, fields, sku ? { skuNormalized: sku } : {});
    return product.save({ session });
  });
}

import type { FilterQuery, InferSchemaType } from 'mongoose';
import { productQuery } from '../queries.js';
export async function listProducts(query: z.infer<typeof productQuery>) {
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
  return { data, meta: { page: query.page, limit: query.limit, total } };
}
export async function getProduct(id: string) {
  const product = await Product.findById(id).lean();
  if (!product) throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
  return product;
}
export async function deactivateProduct(id: string) {
  const product = await Product.findByIdAndUpdate(id, { active: false }, { new: true });
  if (!product) throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
  return product;
}

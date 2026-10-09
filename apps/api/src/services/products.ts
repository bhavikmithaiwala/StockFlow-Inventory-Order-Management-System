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

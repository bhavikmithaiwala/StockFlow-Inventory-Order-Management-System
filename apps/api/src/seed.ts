import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';
import { config } from './config.js';
import { connectDatabase } from './database.js';
import { User } from './models/user.js';
import { Category } from './models/category.js';
import { Supplier } from './models/supplier.js';
import { Product } from './models/product.js';
import { Order } from './models/order.js';
import { hashPassword } from './security/password.js';
import { createProduct } from './services/products.js';
import { productInput } from './models/product.js';
import { receiveStock } from './services/inventory.js';
import { createDraft, confirmOrder, fulfillOrder, cancelOrder } from './services/orders.js';

export async function seedDemo() {
  if (config.NODE_ENV === 'production') throw new Error('Demo seed is disabled in production');
  for (const collection of await mongoose.connection.db!.listCollections().toArray()) {
    if (await mongoose.connection.collection(collection.name).countDocuments())
      throw new Error(
        'Demo seed requires an empty database; existing work will not be overwritten',
      );
  }
  const password = process.env['DEMO_PASSWORD'] ?? 'StockFlowDemo!2026';
  if (password.length < 12 || password.length > 128)
    throw new Error('Demo password must have 12–128 characters');
  const passwordHash = await hashPassword(password);
  const [admin, staff] = await User.create([
    { name: 'Demo Admin', emailNormalized: 'admin@stockflow.test', passwordHash, role: 'admin' },
    { name: 'Demo Staff', emailNormalized: 'staff@stockflow.test', passwordHash, role: 'staff' },
  ]);
  const categories = await Category.create([
    { name: 'Office supplies' },
    { name: 'Packaging' },
    { name: 'Equipment' },
  ]);
  const suppliers = await Supplier.create([
    {
      name: 'North Supply',
      contactName: 'Avery Chen',
      email: 'contact@north.example',
      phone: '+1 555 0100',
    },
    { name: 'Harbor Packaging', contactName: 'Morgan Lee', email: 'sales@harbor.example' },
  ]);
  const fixtures = [
    {
      sku: 'OFFICE-001',
      name: 'Notebook',
      cents: 450,
      quantity: 40,
      reorder: 10,
      category: 0,
      supplier: 0,
    },
    {
      sku: 'OFFICE-002',
      name: 'Ballpoint pen',
      cents: 125,
      quantity: 8,
      reorder: 10,
      category: 0,
      supplier: 0,
    },
    {
      sku: 'PKG-001',
      name: 'Shipping box',
      cents: 180,
      quantity: 60,
      reorder: 20,
      category: 1,
      supplier: 1,
    },
    {
      sku: 'PKG-002',
      name: 'Bubble wrap roll',
      cents: 900,
      quantity: 0,
      reorder: 5,
      category: 1,
      supplier: 1,
    },
    {
      sku: 'EQP-001',
      name: 'Label printer',
      cents: 12500,
      quantity: 4,
      reorder: 2,
      category: 2,
      supplier: 0,
    },
    {
      sku: 'EQP-002',
      name: 'Barcode scanner',
      cents: 8900,
      quantity: 10,
      reorder: 3,
      category: 2,
      supplier: 0,
    },
  ];
  const products = [];
  for (const fixture of fixtures) {
    const product = await createProduct(
      productInput.parse({
        sku: fixture.sku,
        name: fixture.name,
        description: 'Local demonstration catalog item',
        categoryId: categories[fixture.category]!.id,
        supplierId: suppliers[fixture.supplier]!.id,
        unitPriceCents: fixture.cents,
        reorderLevel: fixture.reorder,
      }),
    );
    products.push(product!);
    if (fixture.quantity)
      await receiveStock(
        {
          productId: product!.id,
          quantity: fixture.quantity,
          reason: 'Opening demo stock receipt',
        },
        admin!.id,
      );
  }
  await createDraft(
    {
      items: [
        { productId: products[0]!.id, quantity: 2 },
        { productId: products[1]!.id, quantity: 3 },
      ],
    },
    staff!.id,
  );
  const confirmed = await createDraft(
    { items: [{ productId: products[2]!.id, quantity: 5 }] },
    staff!.id,
  );
  await confirmOrder(confirmed.id, staff!.id);
  const fulfilled = await createDraft(
    { items: [{ productId: products[0]!.id, quantity: 4 }] },
    staff!.id,
  );
  await confirmOrder(fulfilled.id, staff!.id);
  await fulfillOrder(fulfilled.id, admin!.id);
  const cancelled = await createDraft(
    { items: [{ productId: products[5]!.id, quantity: 1 }] },
    staff!.id,
  );
  await confirmOrder(cancelled.id, staff!.id);
  await cancelOrder(cancelled.id, 'Demo customer changed plans', staff!.id);
  return { products: await Product.countDocuments(), orders: await Order.countDocuments() };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!/^mongodb:\/\/(127\.0\.0\.1|localhost):27018\//.test(config.MONGODB_URI))
    throw new Error('Demo seed is restricted to the local development MongoDB on 27018');
  try {
    await connectDatabase();
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
    console.log(JSON.stringify({ event: 'demo_seeded', ...(await seedDemo()) }));
  } finally {
    await mongoose.disconnect();
  }
}

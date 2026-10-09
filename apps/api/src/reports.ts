import { Router, type Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { requireAuth } from './auth.js';
import { Product } from './models/product.js';
import { pagination, objectId } from './validation.js';
import { ApiError } from './errors.js';
import { Order } from './models/order.js';
import { StockMovement } from './models/movement.js';
import { orderQuery } from './orders.js';
import { movementQuery } from './inventory.js';
import { csv } from './services/csv.js';

const reportFormat = (query: unknown) =>
  z
    .object({ format: z.enum(['json', 'csv']).default('json') })
    .passthrough()
    .parse(query);
const field = (value: unknown, name: string) =>
  value && typeof value === 'object' && name in value
    ? (value as Record<string, unknown>)[name]
    : '';
async function exportCsv<T>(
  res: Response,
  name: string,
  headers: string[],
  load: (page: number) => Promise<{ data: T[]; meta: { total: number } }>,
  row: (value: T) => unknown[],
) {
  const rows: unknown[][] = [];
  for (let page = 1; ; page++) {
    const result = await load(page);
    if (result.meta.total > 10000)
      throw new ApiError(
        413,
        'EXPORT_TOO_LARGE',
        'Narrow filters to export at most 10,000 records',
      );
    rows.push(...result.data.map(row));
    if (page * 100 >= result.meta.total) break;
  }
  res.setHeader('Content-Disposition', `attachment; filename="${name}.csv"`);
  res.type('text/csv').send(csv(headers, rows));
}

const dateFilter = (from?: string, to?: string) =>
  from || to
    ? {
        createdAt: {
          ...(from ? { $gte: new Date(`${from}T00:00:00.000Z`) } : {}),
          ...(to ? { $lte: new Date(`${to}T23:59:59.999Z`) } : {}),
        },
      }
    : {};
export async function orderReport(query: z.infer<typeof orderQuery>) {
  const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const filter = {
    ...(query.status ? { status: query.status } : {}),
    ...(escaped ? { orderNumber: { $regex: escaped, $options: 'i' } } : {}),
    ...dateFilter(query.from, query.to),
  };
  const [data, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    Order.countDocuments(filter),
  ]);
  return { data, meta: { page: query.page, limit: query.limit, total } };
}
export async function movementReport(query: z.infer<typeof movementQuery>) {
  const filter = {
    ...(query.productId ? { productId: query.productId } : {}),
    ...(query.type ? { type: query.type } : {}),
    ...dateFilter(query.from, query.to),
  };
  const [data, total] = await Promise.all([
    StockMovement.find(filter)
      .populate('productId', 'name skuNormalized')
      .populate('actorId', 'name')
      .sort({ createdAt: -1, _id: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    StockMovement.countDocuments(filter),
  ]);
  return { data, meta: { page: query.page, limit: query.limit, total } };
}

export const inventoryReportQuery = pagination
  .extend({
    active: z.enum(['true', 'false']).default('true'),
    lowStock: z.enum(['true', 'false']).default('false'),
    categoryId: objectId.optional(),
    supplierId: objectId.optional(),
  })
  .strict();
export async function inventoryReport(query: z.infer<typeof inventoryReportQuery>) {
  const filter = {
    active: query.active === 'true',
    ...(query.categoryId ? { categoryId: new mongoose.Types.ObjectId(query.categoryId) } : {}),
    ...(query.supplierId ? { supplierId: new mongoose.Types.ObjectId(query.supplierId) } : {}),
    ...(query.lowStock === 'true' ? { $expr: { $lte: ['$quantity', '$reorderLevel'] } } : {}),
  };
  const [products, totals] = await Promise.all([
    Product.find(filter)
      .sort({ skuNormalized: 1, _id: 1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    Product.aggregate<{ total: number; quantity: number; valueCents: number }>([
      { $match: filter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          quantity: { $sum: '$quantity' },
          valueCents: { $sum: { $multiply: ['$quantity', '$unitPriceCents'] } },
        },
      },
    ]),
  ]);
  const summary = totals[0] ?? { total: 0, quantity: 0, valueCents: 0 };
  if (!Number.isSafeInteger(summary.valueCents))
    throw new ApiError(409, 'MONEY_OVERFLOW', 'Report valuation exceeds supported integer cents');
  return {
    data: products.map((product) => ({
      ...product,
      valueCents: product.quantity * product.unitPriceCents,
      lowStock: product.quantity <= product.reorderLevel,
    })),
    meta: { page: query.page, limit: query.limit, total: summary.total },
    summary: { quantity: summary.quantity, valueCents: summary.valueCents },
  };
}
export const reportsRouter = Router();
reportsRouter.use(requireAuth);
reportsRouter.get('/orders', async (req, res) => {
  const { format, ...filters } = reportFormat(req.query);
  const query = orderQuery.parse(filters);
  if (format === 'json') return res.json(await orderReport(query));
  await exportCsv(
    res,
    'orders',
    ['Order number', 'Status', 'Total cents', 'Created at'],
    (page) => orderReport({ ...query, page, limit: 100 }),
    (order) => [order.orderNumber, order.status, order.totalCents, order.createdAt.toISOString()],
  );
});
reportsRouter.get('/stock-movements', async (req, res) => {
  const { format, ...filters } = reportFormat(req.query);
  const query = movementQuery.parse(filters);
  if (format === 'json') return res.json(await movementReport(query));
  await exportCsv(
    res,
    'stock-movements',
    ['Created at', 'SKU', 'Type', 'Delta', 'Before', 'After', 'Reason', 'Actor'],
    (page) => movementReport({ ...query, page, limit: 100 }),
    (movement) => [
      movement.createdAt?.toISOString(),
      field(movement.productId, 'skuNormalized'),
      movement.type,
      movement.delta,
      movement.beforeQuantity,
      movement.afterQuantity,
      movement.reason,
      field(movement.actorId, 'name'),
    ],
  );
});
reportsRouter.get('/inventory', async (req, res) => {
  const { format, ...filters } = reportFormat(req.query);
  const query = inventoryReportQuery.parse(filters);
  if (format === 'json') return res.json(await inventoryReport(query));
  await exportCsv(
    res,
    'inventory',
    ['SKU', 'Name', 'Quantity', 'Unit price cents', 'Value cents', 'Reorder level'],
    (page) => inventoryReport({ ...query, page, limit: 100 }),
    (product) => [
      product.skuNormalized,
      product.name,
      product.quantity,
      product.unitPriceCents,
      product.valueCents,
      product.reorderLevel,
    ],
  );
});

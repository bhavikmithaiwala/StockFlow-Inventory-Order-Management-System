import { Router, type Response } from 'express';
import { z } from 'zod';
import { requireAuth } from './auth.js';
import { ApiError } from './errors.js';
import { csv } from './services/csv.js';
import { orderQuery, movementQuery } from './queries.js';
import {
  inventoryReportQuery,
  inventoryReport,
  orderReport,
  movementReport,
} from './services/reports.js';
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

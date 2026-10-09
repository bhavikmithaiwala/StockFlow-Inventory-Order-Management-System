import { Product } from '../models/product.js';
import { Order } from '../models/order.js';
import { StockMovement } from '../models/movement.js';
import { ApiError } from '../errors.js';
export async function dashboardStats() {
  const lowStock = { active: true, $expr: { $lte: ['$quantity', '$reorderLevel'] } };
  const [
    inventory,
    lowStockCount,
    orderStatuses,
    recentMovements,
    recentOrders,
    categoryBreakdown,
  ] = await Promise.all([
    Product.aggregate<{ productCount: number; totalUnits: number; inventoryValueCents: number }>([
      { $match: { active: true } },
      {
        $group: {
          _id: null,
          productCount: { $sum: 1 },
          totalUnits: { $sum: '$quantity' },
          inventoryValueCents: { $sum: { $multiply: ['$quantity', '$unitPriceCents'] } },
        },
      },
    ]),
    Product.countDocuments(lowStock),
    Order.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    StockMovement.find()
      .populate('productId', 'name skuNormalized')
      .populate('actorId', 'name')
      .sort({ createdAt: -1, _id: -1 })
      .limit(6)
      .lean(),
    Order.find()
      .sort({ createdAt: -1, _id: -1 })
      .limit(5)
      .select('orderNumber status totalCents createdAt')
      .lean(),
    Product.aggregate([
      { $match: { active: true } },
      { $group: { _id: '$categoryId', products: { $sum: 1 }, units: { $sum: '$quantity' } } },
      { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
      {
        $project: {
          products: 1,
          units: 1,
          name: { $ifNull: [{ $arrayElemAt: ['$category.name', 0] }, 'Unknown category'] },
        },
      },
      { $sort: { name: 1 } },
    ]),
  ]);
  const totals = inventory[0] ?? { productCount: 0, totalUnits: 0, inventoryValueCents: 0 };
  if (!Number.isSafeInteger(totals.inventoryValueCents))
    throw new ApiError(
      409,
      'MONEY_OVERFLOW',
      'Inventory valuation exceeds supported integer cents',
    );
  return {
    productCount: totals.productCount,
    totalUnits: totals.totalUnits,
    inventoryValueCents: totals.inventoryValueCents,
    lowStockCount,
    orderStatuses,
    recentMovements,
    recentOrders,
    categoryBreakdown,
  };
}

import { Schema, model } from 'mongoose';

const schema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    type: {
      type: String,
      enum: ['receipt', 'adjustment', 'order-confirmed', 'order-cancelled'],
      required: true,
    },
    delta: {
      type: Number,
      required: true,
      validate: (value: number) => Number.isSafeInteger(value) && value !== 0,
    },
    beforeQuantity: {
      type: Number,
      required: true,
      min: 0,
      max: 1000000,
      validate: Number.isSafeInteger,
    },
    afterQuantity: {
      type: Number,
      required: true,
      min: 0,
      max: 1000000,
      validate: Number.isSafeInteger,
    },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
schema.index({ productId: 1, createdAt: -1 });
schema.index({ type: 1, createdAt: -1 });
schema.index(
  { orderId: 1, productId: 1, type: 1 },
  { unique: true, partialFilterExpression: { orderId: { $type: 'objectId' } } },
);
schema.pre('validate', function () {
  if (['receipt', 'order-cancelled'].includes(this.type) && this.delta <= 0)
    this.invalidate('delta', 'Movement type requires a positive delta');
  if (this.type === 'order-confirmed' && this.delta >= 0)
    this.invalidate('delta', 'Confirmation requires a negative delta');
  if (this.type.startsWith('order-') && !this.orderId)
    this.invalidate('orderId', 'Order movement requires an order reference');
  if (this.afterQuantity - this.beforeQuantity !== this.delta)
    this.invalidate('delta', 'Movement quantities must reconcile');
});
schema.pre('save', function () {
  if (!this.isNew) throw new Error('Stock movements are append-only');
});
for (const operation of [
  'updateOne',
  'updateMany',
  'findOneAndUpdate',
  'replaceOne',
  'deleteOne',
  'deleteMany',
  'findOneAndDelete',
] as const) {
  schema.pre(operation, function () {
    throw new Error('Stock movements are append-only');
  });
}
export const StockMovement = model('StockMovement', schema);

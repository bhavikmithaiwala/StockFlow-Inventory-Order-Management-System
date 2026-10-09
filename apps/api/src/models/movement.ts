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
schema.pre('validate', function () {
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

export interface OrderRecord {
  _id: string;
  orderNumber: string;
  status: 'draft' | 'confirmed' | 'fulfilled' | 'cancelled';
  totalCents: number;
  createdAt: string;
  items: {
    productId: string;
    quantity: number;
    skuSnapshot: string;
    nameSnapshot: string;
    unitPriceCents: number;
  }[];
  history: { action: string; actorId: { name: string } | string; at: string; reason: string }[];
}

export interface ProductRecord {
  _id: string;
  skuNormalized: string;
  name: string;
  description: string;
  categoryId: string;
  supplierId: string;
  unitPriceCents: number;
  quantity: number;
  reorderLevel: number;
  active: boolean;
}
export interface CategoryRecord {
  _id: string;
  name: string;
  active: boolean;
}
export interface SupplierRecord extends CategoryRecord {
  contactName: string;
  email: string;
  phone: string;
  address: string;
}

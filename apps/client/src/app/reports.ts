import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Api, type Page } from './api';
import { ProductRecord, CategoryRecord, SupplierRecord } from './catalog-types';
import { OrderRecord } from './order-types';
import { MovementRecord } from './movements';

type InventoryRow = ProductRecord & { valueCents: number };
type ReportPage = Page<InventoryRow | OrderRecord | MovementRecord> & {
  summary?: { valueCents: number; quantity: number };
};
const money = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
@Component({
  selector: 'app-reports',
  imports: [FormsModule],
  template: `
    <h2>Reports</h2>
    <p>
      Inventory valuation uses current selling prices. Order totals include the selected statuses;
      drafts are estimates. Dates use UTC.
    </p>
    <form class="panel form-grid" (ngSubmit)="load(1)">
      <div>
        <label for="report-kind">Report</label
        ><select
          id="report-kind"
          name="kind"
          [(ngModel)]="kind"
          [disabled]="loading()"
          (ngModelChange)="load(1)"
        >
          <option value="inventory">Inventory valuation / low stock</option>
          <option value="orders">Orders</option>
          <option value="stock-movements">Stock movements</option>
        </select>
      </div>
      @if (kind === 'inventory') {
        <div>
          <label for="report-low-stock">Stock filter</label
          ><select id="report-low-stock" name="low-stock" [(ngModel)]="lowStock">
            <option value="false">All active products</option>
            <option value="true">Low stock only</option>
          </select>
        </div>
        <div>
          <label for="report-category">Category</label
          ><select id="report-category" name="category" [(ngModel)]="categoryId">
            <option value="">All categories</option>
            @for (category of categories(); track category._id) {
              <option [value]="category._id">{{ category.name }}</option>
            }
          </select>
        </div>
        <div>
          <label for="report-supplier">Supplier</label
          ><select id="report-supplier" name="supplier" [(ngModel)]="supplierId">
            <option value="">All suppliers</option>
            @for (supplier of suppliers(); track supplier._id) {
              <option [value]="supplier._id">{{ supplier.name }}</option>
            }
          </select>
        </div>
      } @else {
        <div>
          <label for="report-from">From</label
          ><input id="report-from" type="date" name="from" [(ngModel)]="from" />
        </div>
        <div>
          <label for="report-to">To</label
          ><input id="report-to" type="date" name="to" [(ngModel)]="to" />
        </div>
        @if (kind === 'orders') {
          <div>
            <label for="report-status">Status</label
            ><select id="report-status" name="status" [(ngModel)]="status">
              <option value="">All</option>
              <option>draft</option>
              <option>confirmed</option>
              <option>fulfilled</option>
              <option>cancelled</option>
            </select>
          </div>
        } @else {
          <div>
            <label for="report-product">Product</label
            ><select id="report-product" name="product" [(ngModel)]="productId">
              <option value="">All</option>
              @for (product of products(); track product._id) {
                <option [value]="product._id">
                  {{ product.skuNormalized }} · {{ product.name }}
                </option>
              }
            </select>
          </div>
          <div>
            <label for="report-type">Movement type</label
            ><select id="report-type" name="type" [(ngModel)]="type">
              <option value="">All</option>
              <option value="receipt">Receipt</option>
              <option value="adjustment">Adjustment</option>
              <option value="order-confirmed">Order confirmed</option>
              <option value="order-cancelled">Order cancelled</option>
            </select>
          </div>
        }
      }
      <button type="submit" [disabled]="loading()">Apply filters</button
      ><button type="button" [disabled]="loading() || downloading()" (click)="download()">
        {{ downloading() ? 'Exporting…' : 'Export filtered CSV' }}
      </button>
    </form>
    @if (loading()) {
      <p role="status">Loading report…</p>
    }
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
    @if (result(); as data) {
      @if (data.summary) {
        <p>
          Filtered inventory: {{ data.summary.quantity }} units ·
          {{ formatMoney(data.summary.valueCents) }}
        </p>
      }
      <div class="panel table-scroll">
        <table>
          <caption>
            {{
              data.meta.total
            }}
            matching records
          </caption>
          <thead>
            <tr>
              @for (column of columns(); track column) {
                <th>{{ column }}</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (row of rows(); track $index) {
              <tr>
                @for (cell of row; track $index) {
                  <td>{{ cell }}</td>
                }
              </tr>
            } @empty {
              <tr>
                <td [attr.colspan]="columns().length">
                  No records match these filters. Broaden filters or record inventory/order
                  activity.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <div class="actions">
        <button [disabled]="loading() || data.meta.page <= 1" (click)="load(data.meta.page - 1)">
          Previous</button
        ><span>Page {{ data.meta.page }}</span
        ><button
          [disabled]="loading() || data.meta.page * data.meta.limit >= data.meta.total"
          (click)="load(data.meta.page + 1)"
        >
          Next
        </button>
      </div>
    }
  `,
})
export class Reports {
  private readonly api = inject(Api);
  readonly formatMoney = money;
  readonly categories = signal<CategoryRecord[]>([]);
  readonly suppliers = signal<SupplierRecord[]>([]);
  readonly products = signal<ProductRecord[]>([]);
  readonly result = signal<ReportPage | null>(null);
  readonly columns = signal<string[]>([]);
  readonly rows = signal<string[][]>([]);
  readonly loading = signal(false);
  readonly downloading = signal(false);
  readonly error = signal('');
  kind: 'inventory' | 'orders' | 'stock-movements' = 'inventory';
  lowStock = 'false';
  categoryId = '';
  supplierId = '';
  productId = '';
  type = '';
  status = '';
  from = '';
  to = '';
  constructor() {
    Promise.all([
      this.api.all<CategoryRecord>('categories'),
      this.api.all<SupplierRecord>('suppliers'),
      this.api.all<ProductRecord>('products'),
    ])
      .then(([categories, suppliers, products]) => {
        this.categories.set(categories);
        this.suppliers.set(suppliers);
        this.products.set(products);
      })
      .catch(() => this.error.set('Report lookup filters unavailable. Reload to retry.'));
    this.load(1);
  }
  private filters(): Record<string, string> {
    return this.kind === 'inventory'
      ? {
          lowStock: this.lowStock,
          ...(this.categoryId ? { categoryId: this.categoryId } : {}),
          ...(this.supplierId ? { supplierId: this.supplierId } : {}),
        }
      : {
          ...(this.from ? { from: this.from } : {}),
          ...(this.to ? { to: this.to } : {}),
          ...(this.kind === 'orders'
            ? this.status
              ? { status: this.status }
              : {}
            : {
                ...(this.productId ? { productId: this.productId } : {}),
                ...(this.type ? { type: this.type } : {}),
              }),
        };
  }
  load(page: number) {
    this.loading.set(true);
    this.error.set('');
    this.result.set(null);
    this.api.get<ReportPage>(`reports/${this.kind}`, { ...this.filters(), page }).subscribe({
      next: (result) => {
        this.result.set(result);
        this.columns.set(
          this.kind === 'inventory'
            ? ['SKU', 'Name', 'Quantity', 'Unit price', 'Value', 'Reorder level']
            : this.kind === 'orders'
              ? ['Order number', 'Status', 'Total', 'Created']
              : ['Created', 'Product', 'Type', 'Delta', 'Before / after', 'Reason'],
        );
        this.rows.set(
          result.data.map((row) =>
            'skuNormalized' in row
              ? [
                  row.skuNormalized,
                  row.name,
                  String(row.quantity),
                  money(row.unitPriceCents),
                  money(row.valueCents),
                  String(row.reorderLevel),
                ]
              : 'orderNumber' in row
                ? [
                    row.orderNumber,
                    row.status,
                    money(row.totalCents),
                    new Date(row.createdAt).toLocaleString(),
                  ]
                : [
                    new Date(row.createdAt).toLocaleString(),
                    row.productId?.skuNormalized ?? 'Unknown product',
                    row.type,
                    String(row.delta),
                    `${row.beforeQuantity} / ${row.afterQuantity}`,
                    row.reason,
                  ],
          ),
        );
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(
          error.error?.error?.message ?? 'Unable to load report. Check filters and retry.',
        );
        this.loading.set(false);
      },
    });
  }
  download() {
    this.downloading.set(true);
    this.error.set('');
    const kind = this.kind;
    this.api.download(`reports/${kind}`, { ...this.filters(), format: 'csv' }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${kind}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        this.downloading.set(false);
      },
      error: () => {
        this.downloading.set(false);
        this.error.set('Unable to export. Narrow filters to at most 10,000 records and retry.');
      },
    });
  }
}

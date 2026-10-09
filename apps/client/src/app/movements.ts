import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Api, type Page } from './api';
import { ProductRecord } from './catalog-types';

export interface MovementRecord {
  _id: string;
  productId: { _id: string; name: string; skuNormalized: string } | null;
  actorId: { name: string } | null;
  type: string;
  delta: number;
  beforeQuantity: number;
  afterQuantity: number;
  reason: string;
  createdAt: string;
}
@Component({
  selector: 'app-movements',
  imports: [FormsModule, DatePipe],
  template: `
    <h2>Stock movements</h2>
    <p>Audit history is append-only. Date filters use UTC.</p>
    <form class="panel form-grid" (ngSubmit)="load(1)">
      <div>
        <label for="movement-product">Product</label
        ><select id="movement-product" name="product" [(ngModel)]="productId">
          <option value="">All products</option>
          @for (product of products(); track product._id) {
            <option [value]="product._id">{{ product.skuNormalized }} · {{ product.name }}</option>
          }
        </select>
      </div>
      <div>
        <label for="movement-type">Type</label
        ><select id="movement-type" name="type" [(ngModel)]="type">
          <option value="">All types</option>
          <option value="receipt">Receipt</option>
          <option value="adjustment">Adjustment</option>
          <option value="order-confirmed">Order confirmed</option>
          <option value="order-cancelled">Order cancelled</option>
        </select>
      </div>
      <div>
        <label for="movement-from">From date</label
        ><input id="movement-from" type="date" name="from" [(ngModel)]="from" />
      </div>
      <div>
        <label for="movement-to">To date</label
        ><input id="movement-to" type="date" name="to" [(ngModel)]="to" />
      </div>
      <button type="submit" [disabled]="loading()">Apply filters</button>
    </form>
    @if (loading()) {
      <p role="status">Loading movements…</p>
    }
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
    @if (result(); as page) {
      <div class="panel table-scroll">
        <table>
          <caption>
            {{
              page.meta.total
            }}
            movements
          </caption>
          <thead>
            <tr>
              <th>When</th>
              <th>Product</th>
              <th>Type</th>
              <th>Change</th>
              <th>Before → after</th>
              <th>Reason / actor</th>
            </tr>
          </thead>
          <tbody>
            @for (movement of page.data; track movement._id) {
              <tr>
                <td>{{ movement.createdAt | date: 'short' }}</td>
                <td>{{ movement.productId?.skuNormalized }} · {{ movement.productId?.name }}</td>
                <td>{{ movement.type }}</td>
                <td>{{ movement.delta }}</td>
                <td>{{ movement.beforeQuantity }} → {{ movement.afterQuantity }}</td>
                <td>{{ movement.reason }} · {{ movement.actorId?.name ?? 'Unknown actor' }}</td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6">No movements match these filters.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <div class="actions">
        <button [disabled]="loading() || page.meta.page <= 1" (click)="load(page.meta.page - 1)">
          Previous</button
        ><span>Page {{ page.meta.page }}</span
        ><button
          [disabled]="loading() || page.meta.page * page.meta.limit >= page.meta.total"
          (click)="load(page.meta.page + 1)"
        >
          Next
        </button>
      </div>
    }
  `,
})
export class Movements {
  private readonly api = inject(Api);
  readonly products = signal<ProductRecord[]>([]);
  readonly result = signal<Page<MovementRecord> | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  productId = '';
  type = '';
  from = '';
  to = '';
  constructor() {
    this.api
      .all<ProductRecord>('products')
      .then((products) => this.products.set(products))
      .catch(() => this.error.set('Product lookup unavailable.'));
    this.load(1);
  }
  load(page: number) {
    this.loading.set(true);
    this.error.set('');
    this.api
      .get<Page<MovementRecord>>('inventory/movements', {
        page,
        ...(this.productId ? { productId: this.productId } : {}),
        ...(this.type ? { type: this.type } : {}),
        ...(this.from ? { from: this.from } : {}),
        ...(this.to ? { to: this.to } : {}),
      })
      .subscribe({
        next: (result) => {
          this.result.set(result);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Unable to load movements. Check date filters and retry.');
          this.loading.set(false);
        },
      });
  }
}

import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Api, type Result } from './api';
import { ProductRecord } from './catalog-types';
import { SessionState } from './session';
import { StockStatus } from './stock-status';

@Component({
  selector: 'app-product-detail',
  imports: [CurrencyPipe, RouterLink, StockStatus],
  template: `
    <a routerLink="/products">Back to products</a>
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
    @if (product(); as item) {
      <h2>{{ item.name }}</h2>
      <section class="panel">
        <p>SKU: {{ item.skuNormalized }}</p>
        <p>{{ item.description || 'No description provided.' }}</p>
        <dl>
          <dt>Unit price</dt>
          <dd>{{ item.unitPriceCents / 100 | currency: 'USD' }}</dd>
          <dt>Quantity</dt>
          <dd>
            {{ item.quantity }}
            <app-stock-status
              [quantity]="item.quantity"
              [reorderLevel]="item.reorderLevel"
              [active]="item.active"
            />
          </dd>
          <dt>Reorder level</dt>
          <dd>{{ item.reorderLevel }}</dd>
          <dt>Activity</dt>
          <dd>{{ item.active ? 'Active' : 'Inactive' }}</dd>
        </dl>
        @if (session.user()?.role === 'admin') {
          <a [routerLink]="['/products', item._id, 'edit']">Edit product</a>
        }
      </section>
    } @else if (!error()) {
      <p role="status">Loading product…</p>
    }
  `,
})
export class ProductDetail {
  readonly session = inject(SessionState);
  readonly product = signal<ProductRecord | null>(null);
  readonly error = signal('');
  constructor() {
    const id = inject(ActivatedRoute).snapshot.paramMap.get('id');
    inject(Api)
      .get<Result<ProductRecord>>(`products/${id}`)
      .subscribe({
        next: (result) => this.product.set(result.data),
        error: () => this.error.set('Product unavailable or not found.'),
      });
  }
}

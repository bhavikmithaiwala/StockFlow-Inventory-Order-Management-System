import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Api, type Page } from './api';
import { ProductRecord } from './catalog-types';
import { SessionState } from './session';

@Component({
  selector: 'app-product-list',
  imports: [FormsModule, CurrencyPipe, RouterLink],
  template: `
    <h2>Products</h2>
    <form class="panel form-grid" (ngSubmit)="load(1)">
      <div>
        <label for="product-search">Search name or SKU</label
        ><input id="product-search" [(ngModel)]="search" name="search" />
      </div>
      <div>
        <label for="active-filter">Activity</label
        ><select id="active-filter" [(ngModel)]="active" name="active">
          <option value="">All products</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>
      <div>
        <label for="sort-filter">Sort</label
        ><select id="sort-filter" [(ngModel)]="sort" name="sort">
          <option value="name">Name</option>
          <option value="skuNormalized">SKU</option>
          <option value="quantity">Quantity</option>
          <option value="unitPriceCents">Unit price</option>
        </select>
      </div>
      <button type="submit" [disabled]="loading()">Apply filters</button>
    </form>
    @if (session.user()?.role === 'admin') {
      <a routerLink="/products/new">Create product</a>
    }
    @if (loading()) {
      <p role="status">Loading products…</p>
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
            products
          </caption>
          <thead>
            <tr>
              <th>SKU / name</th>
              <th>Unit price</th>
              <th>Stock</th>
              <th>Activity</th>
            </tr>
          </thead>
          <tbody>
            @for (product of page.data; track product._id) {
              <tr>
                <td>
                  <a [routerLink]="['/products', product._id]"
                    >{{ product.skuNormalized }} · {{ product.name }}</a
                  >
                </td>
                <td>{{ product.unitPriceCents / 100 | currency: 'USD' }}</td>
                <td>{{ product.quantity }}</td>
                <td>{{ product.active ? 'Active' : 'Inactive' }}</td>
              </tr>
            } @empty {
              <tr>
                <td colspan="4">No products match these filters.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <div class="actions">
        <button (click)="load(page.meta.page - 1)" [disabled]="loading() || page.meta.page <= 1">
          Previous</button
        ><span>Page {{ page.meta.page }}</span
        ><button
          (click)="load(page.meta.page + 1)"
          [disabled]="loading() || page.meta.page * page.meta.limit >= page.meta.total"
        >
          Next
        </button>
      </div>
    }
  `,
})
export class ProductList {
  private readonly api = inject(Api);
  readonly session = inject(SessionState);
  readonly result = signal<Page<ProductRecord> | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  search = '';
  active = 'true';
  sort = 'name';
  constructor() {
    this.load(1);
  }
  load(page: number) {
    this.loading.set(true);
    this.error.set('');
    this.api
      .get<Page<ProductRecord>>('products', {
        page,
        search: this.search,
        sort: this.sort,
        ...(this.active ? { active: this.active } : {}),
      })
      .subscribe({
        next: (result) => {
          this.result.set(result);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Unable to load products. Try again.');
          this.loading.set(false);
        },
      });
  }
}

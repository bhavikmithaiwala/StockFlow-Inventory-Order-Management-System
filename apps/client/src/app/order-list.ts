import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Api, type Page } from './api';
import { OrderRecord } from './order-types';
@Component({
  selector: 'app-order-list',
  imports: [FormsModule, CurrencyPipe, DatePipe, RouterLink],
  template: `
    <h2>Orders</h2>
    <a routerLink="/orders/new">Create draft order</a>
    <form class="panel form-grid" (ngSubmit)="load(1)">
      <div>
        <label for="order-search">Order number</label
        ><input id="order-search" name="search" [(ngModel)]="search" />
      </div>
      <div>
        <label for="order-status">Status</label
        ><select id="order-status" name="status" [(ngModel)]="status">
          <option value="">All statuses</option>
          <option>draft</option>
          <option>confirmed</option>
          <option>fulfilled</option>
          <option>cancelled</option>
        </select>
      </div>
      <button type="submit">Apply filters</button>
    </form>
    @if (loading()) {
      <p role="status">Loading orders…</p>
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
            orders
          </caption>
          <thead>
            <tr>
              <th>Order number</th>
              <th>Status</th>
              <th>Total</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            @for (order of page.data; track order._id) {
              <tr>
                <td>
                  <a [routerLink]="['/orders', order._id]">{{ order.orderNumber }}</a>
                </td>
                <td>{{ order.status }}</td>
                <td>{{ order.totalCents / 100 | currency: 'USD' }}</td>
                <td>{{ order.createdAt | date: 'short' }}</td>
              </tr>
            } @empty {
              <tr>
                <td colspan="4">No orders match these filters.</td>
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
export class OrderList {
  private readonly api = inject(Api);
  readonly result = signal<Page<OrderRecord> | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  status = '';
  search = '';
  constructor() {
    this.load(1);
  }
  load(page: number) {
    this.loading.set(true);
    this.error.set('');
    this.api
      .get<Page<OrderRecord>>('orders', {
        page,
        search: this.search,
        ...(this.status ? { status: this.status } : {}),
      })
      .subscribe({
        next: (result) => {
          this.result.set(result);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Unable to load orders. Retry filters.');
          this.loading.set(false);
        },
      });
  }
}

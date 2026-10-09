import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Api, type Result } from './api';
import { OrderRecord } from './order-types';
@Component({
  selector: 'app-order-detail',
  imports: [CurrencyPipe, DatePipe, RouterLink],
  template: `
    <a routerLink="/orders">Back to orders</a>
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
    @if (order(); as item) {
      <h2>{{ item.orderNumber }}</h2>
      <p>
        Status: <strong>{{ item.status }}</strong>
      </p>
      <div class="panel table-scroll">
        <table>
          <caption>
            Order items
          </caption>
          <thead>
            <tr>
              <th>Product</th>
              <th>Quantity</th>
              <th>Unit price</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            @for (line of item.items; track line.productId) {
              <tr>
                <td>{{ line.skuSnapshot }} · {{ line.nameSnapshot }}</td>
                <td>{{ line.quantity }}</td>
                <td>{{ line.unitPriceCents / 100 | currency: 'USD' }}</td>
                <td>{{ (line.quantity * line.unitPriceCents) / 100 | currency: 'USD' }}</td>
              </tr>
            }
          </tbody>
        </table>
        <p>
          Total: <strong>{{ item.totalCents / 100 | currency: 'USD' }}</strong>
        </p>
        @if (item.status === 'draft') {
          <p class="muted">
            Draft prices are estimates. Current product prices are captured on confirmation.
          </p>
        }
      </div>
      <section class="panel">
        <h3>Order history</h3>
        <ul>
          @for (event of item.history; track $index) {
            <li>
              {{ event.action }} · {{ event.at | date: 'short' }} · {{ actorName(event.actorId) }}
              {{ event.reason }}
            </li>
          }
        </ul>
      </section>
    } @else if (!error()) {
      <p role="status">Loading order…</p>
    }
  `,
})
export class OrderDetail {
  private readonly api = inject(Api);
  readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id');
  readonly order = signal<OrderRecord | null>(null);
  readonly error = signal('');
  constructor() {
    this.load();
  }
  actorName(actor: { name: string } | string) {
    return typeof actor === 'string' ? 'Warehouse user' : (actor?.name ?? 'Unknown actor');
  }
  load() {
    this.api
      .get<Result<OrderRecord>>(`orders/${this.id}`)
      .subscribe({
        next: (result) => this.order.set(result.data),
        error: () => this.error.set('Order unavailable or not found.'),
      });
  }
}

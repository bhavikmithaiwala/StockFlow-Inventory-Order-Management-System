import { Component, computed, inject, signal } from '@angular/core';
import { SummaryChart } from './summary-chart';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Api, type Result, type Page } from './api';
import { ProductRecord } from './catalog-types';
import { MovementRecord } from './movements';
import { OrderRecord } from './order-types';

export interface DashboardStats {
  productCount: number;
  totalUnits: number;
  inventoryValueCents: number;
  lowStockCount: number;
  orderStatuses: { _id: string; count: number }[];
  categoryBreakdown: { name: string; units: number; products: number }[];
  recentOrders: OrderRecord[];
  recentMovements: MovementRecord[];
}
@Component({
  selector: 'app-dashboard',
  imports: [CurrencyPipe, DatePipe, RouterLink, SummaryChart],
  styles: `
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
    }
    .summary strong {
      display: block;
      font-size: 1.8rem;
    }
  `,
  template: `
    <h2>Warehouse dashboard</h2>
    @if (stats()) {
      <div class="summary">
        <app-summary-chart title="Orders by status" [data]="orderBars()" /><app-summary-chart
          title="Units by category"
          [data]="categoryBars()"
        />
      </div>
    }
    <button type="button" (click)="load()" [disabled]="loading()">Refresh dashboard</button>
    @if (loading()) {
      <p role="status">Loading warehouse activity…</p>
    }
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
    @if (stats(); as data) {
      <div class="summary">
        <section class="panel">
          <h3>Active products</h3>
          <strong>{{ data.productCount }}</strong>
        </section>
        <section class="panel">
          <h3>Units on hand</h3>
          <strong>{{ data.totalUnits }}</strong>
        </section>
        <section class="panel">
          <h3>Inventory value</h3>
          <strong>{{ data.inventoryValueCents / 100 | currency: 'USD' }}</strong>
          <p>At current selling prices</p>
        </section>
        <section class="panel">
          <h3>Low stock</h3>
          <strong>{{ data.lowStockCount }}</strong>
        </section>
      </div>
      <section class="panel">
        <h3>Reorder alerts</h3>
        <ul>
          @for (product of lowStock(); track product._id) {
            <li>
              <a [routerLink]="['/products', product._id]"
                >{{ product.skuNormalized }} · {{ product.name }}</a
              >: {{ product.quantity }} remaining; reorder level {{ product.reorderLevel }}
            </li>
          } @empty {
            <li>No active products need replenishment.</li>
          }
        </ul>
        @if (data.lowStockCount > lowStock().length) {
          <p>Showing the six lowest-stock products. See inventory reports for all alerts.</p>
        }
      </section>
      <section class="panel">
        <h3>Recent orders</h3>
        <ul>
          @for (order of data.recentOrders; track order._id) {
            <li>
              <a [routerLink]="['/orders', order._id]">{{ order.orderNumber }}</a> ·
              {{ order.status }} · {{ order.totalCents / 100 | currency: 'USD' }}
            </li>
          } @empty {
            <li>No orders yet. Create a draft from the Orders page.</li>
          }
        </ul>
      </section>
      <section class="panel">
        <h3>Recent stock activity</h3>
        <ul>
          @for (movement of data.recentMovements; track movement._id) {
            <li>
              {{ movement.createdAt | date: 'short' }} · {{ movement.productId?.name }} ·
              {{ movement.delta }} units · {{ movement.reason }}
            </li>
          } @empty {
            <li>No stock movements yet. Receive a delivery from Inventory.</li>
          }
        </ul>
        <a routerLink="/movements">View audit history</a>
      </section>
    }
  `,
})
export class Dashboard {
  readonly orderBars = computed(
    () => this.stats()?.orderStatuses.map((item) => ({ label: item._id, value: item.count })) ?? [],
  );
  readonly categoryBars = computed(
    () =>
      this.stats()?.categoryBreakdown.map((item) => ({ label: item.name, value: item.units })) ??
      [],
  );
  private readonly api = inject(Api);
  readonly stats = signal<DashboardStats | null>(null);
  readonly lowStock = signal<ProductRecord[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  constructor() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.error.set('');
    forkJoin({
      stats: this.api.get<Result<DashboardStats>>('dashboard/stats'),
      lowStock: this.api.get<Page<ProductRecord>>('inventory/low-stock', { limit: 6 }),
    }).subscribe({
      next: (result) => {
        this.stats.set(result.stats.data);
        this.lowStock.set(result.lowStock.data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load dashboard. Retry refresh.');
        this.loading.set(false);
      },
    });
  }
}

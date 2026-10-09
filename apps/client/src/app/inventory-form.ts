import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Api, type Result } from './api';
import { ProductRecord } from './catalog-types';
import { SessionState } from './session';

@Component({
  selector: 'app-inventory-form',
  imports: [ReactiveFormsModule],
  template: `
    <h2>Inventory</h2>
    <p>Receive deliveries or record a stock correction with an audit reason.</p>
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
    @if (success()) {
      <p role="status">{{ success() }}</p>
    }
    @if (loading()) {
      <p role="status">Loading products…</p>
    }
    <form class="panel" [formGroup]="form" (ngSubmit)="save()">
      <div class="form-grid">
        <div>
          <label for="inventory-product">Product</label
          ><select id="inventory-product" formControlName="productId">
            <option value="">Choose product</option>
            @for (product of products(); track product._id) {
              <option [value]="product._id">
                {{ product.skuNormalized }} · {{ product.name }} ({{ product.quantity }} units)
              </option>
            }
          </select>
        </div>
        <div>
          <label for="inventory-mode">Operation</label
          ><select id="inventory-mode" formControlName="mode">
            <option value="receive">Receive stock</option>
            @if (session.user()?.role === 'admin') {
              <option value="adjust">Adjust stock</option>
            }
          </select>
        </div>
        <div>
          <label for="inventory-quantity">{{
            form.controls.mode.value === 'receive'
              ? 'Units received'
              : 'Signed quantity change (+ / -)'
          }}</label
          ><input id="inventory-quantity" type="number" step="1" formControlName="quantity" />
        </div>
      </div>
      <label for="inventory-reason">Reason</label
      ><textarea id="inventory-reason" formControlName="reason"></textarea>
      @if (form.touched && form.invalid) {
        <p class="error">Choose a product, whole quantity and reason.</p>
      }
      <div class="actions">
        <button type="submit" [disabled]="busy() || loading()">
          {{ busy() ? 'Recording…' : 'Record stock change' }}</button
        ><button type="button" (click)="load()">Refresh products</button>
      </div>
    </form>
  `,
})
export class InventoryForm {
  private readonly api = inject(Api);
  readonly session = inject(SessionState);
  readonly products = signal<ProductRecord[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly form = inject(FormBuilder).nonNullable.group({
    productId: ['', Validators.required],
    mode: ['receive'],
    quantity: [
      1,
      [
        Validators.required,
        Validators.pattern(/^-?\d+$/),
        Validators.min(-1000000),
        Validators.max(1000000),
      ],
    ],
    reason: ['', [Validators.required, Validators.maxLength(500)]],
  });
  constructor() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.api
      .all<ProductRecord>('products')
      .then((products) => {
        this.products.set(products.filter((product) => product.active));
        this.loading.set(false);
      })
      .catch(() => {
        this.loading.set(false);
        this.error.set('Unable to load products. Retry refresh.');
      });
  }
  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    if (value.quantity === 0 || (value.mode === 'receive' && value.quantity < 1)) {
      this.error.set('Receive a positive whole quantity; adjustments must be nonzero.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.success.set('');
    this.api
      .post<Result<{ quantity: number }>>(`inventory/${value.mode}`, {
        productId: value.productId,
        reason: value.reason,
        ...(value.mode === 'receive' ? { quantity: value.quantity } : { delta: value.quantity }),
      })
      .subscribe({
        next: (result) => {
          this.busy.set(false);
          this.success.set(`Stock change recorded. Product now has ${result.data.quantity} units.`);
          this.form.controls.reason.reset();
          this.load();
        },
        error: (error: HttpErrorResponse) => {
          this.busy.set(false);
          this.error.set(error.error?.error?.message ?? 'Unable to record stock change.');
        },
      });
  }
}

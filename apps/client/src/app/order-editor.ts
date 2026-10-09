import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Api, type Result } from './api';
import { ProductRecord } from './catalog-types';
import { OrderRecord } from './order-types';
@Component({
  selector: 'app-order-editor',
  imports: [ReactiveFormsModule, CurrencyPipe, RouterLink],
  template: `
    <a routerLink="/orders">Back to orders</a>
    <h2>{{ id ? 'Edit draft' : 'Create draft order' }}</h2>
    <p>
      Drafts do not reserve stock. Product prices and available stock are checked on confirmation.
    </p>
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
    @if (loading()) {
      <p role="status">Loading product lookup…</p>
    }
    <section class="panel">
      <label for="lookup">Find products by name or SKU</label
      ><input id="lookup" [formControl]="search" />
    </section>
    <form class="panel" [formGroup]="form" (ngSubmit)="save()">
      <div formArrayName="items">
        @for (line of lines.controls; track line; let index = $index) {
          <div class="form-grid" [formGroupName]="index">
            <div>
              <label [for]="'line-product-' + index">Product {{ index + 1 }}</label
              ><select [id]="'line-product-' + index" formControlName="productId">
                <option value="">Choose product</option>
                @for (product of choices(line.controls.productId.value); track product._id) {
                  <option [value]="product._id">
                    {{ product.skuNormalized }} · {{ product.name }} ·
                    {{ product.quantity }} available
                  </option>
                }
              </select>
            </div>
            <div>
              <label [for]="'line-quantity-' + index">Quantity</label
              ><input
                [id]="'line-quantity-' + index"
                type="number"
                min="1"
                step="1"
                formControlName="quantity"
              />
            </div>
            <button type="button" (click)="remove(index)" [disabled]="lines.length === 1">
              Remove line {{ index + 1 }}
            </button>
          </div>
        }
      </div>
      <p>Estimated total: {{ estimate() / 100 | currency: 'USD' }}</p>
      @if (form.touched && form.invalid) {
        <p class="error">Choose products and positive whole quantities.</p>
      }
      <div class="actions">
        <button type="button" (click)="add()" [disabled]="lines.length >= 100">Add product</button
        ><button type="submit" [disabled]="busy() || loading() || !ready()">
          {{ busy() ? 'Saving…' : 'Save draft' }}
        </button>
      </div>
    </form>
  `,
})
export class OrderEditor {
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id');
  readonly products = signal<ProductRecord[]>([]);
  readonly error = signal('');
  readonly loading = signal(true);
  readonly ready = signal(false);
  readonly busy = signal(false);
  readonly search = new FormControl('', { nonNullable: true });
  private line(productId = '', quantity = 1) {
    return this.fb.nonNullable.group({
      productId: [productId, Validators.required],
      quantity: [
        quantity,
        [
          Validators.required,
          Validators.min(1),
          Validators.max(1000000),
          Validators.pattern(/^\d+$/),
        ],
      ],
    });
  }
  readonly form = this.fb.group({ items: this.fb.array([this.line()]) });
  get lines() {
    return this.form.controls.items;
  }
  constructor() {
    void this.initialize();
  }
  choices(selected: string) {
    const search = this.search.value.toLowerCase();
    return this.products().filter(
      (product) =>
        product._id === selected ||
        `${product.name} ${product.skuNormalized}`.toLowerCase().includes(search),
    );
  }
  add() {
    this.lines.push(this.line());
  }
  remove(index: number) {
    if (this.lines.length > 1) this.lines.removeAt(index);
  }
  estimate() {
    return this.lines
      .getRawValue()
      .reduce(
        (sum, line) =>
          sum +
          (this.products().find((product) => product._id === line.productId)?.unitPriceCents ?? 0) *
            line.quantity,
        0,
      );
  }
  private async initialize() {
    try {
      this.products.set(
        (await this.api.all<ProductRecord>('products')).filter((product) => product.active),
      );
      if (this.id) {
        const result = await firstValueFrom(this.api.get<Result<OrderRecord>>(`orders/${this.id}`));
        if (result.data.status !== 'draft') throw new Error('Only drafts can be edited');
        this.lines.clear();
        for (const line of result.data.items)
          this.lines.push(this.line(line.productId, line.quantity));
      }
      this.ready.set(true);
    } catch {
      this.error.set('Draft or product lookup unavailable. Only draft orders can be edited.');
    } finally {
      this.loading.set(false);
    }
  }
  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const input = this.form.getRawValue();
    if (new Set(input.items.map((item) => item.productId)).size !== input.items.length) {
      this.error.set('Choose each product only once.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    const operation = this.id
      ? this.api.patch<Result<OrderRecord>>(`orders/${this.id}`, input)
      : this.api.post<Result<OrderRecord>>('orders', input);
    operation.subscribe({
      next: (result) => void this.router.navigate(['/orders', result.data._id]),
      error: (error: HttpErrorResponse) => {
        this.busy.set(false);
        this.error.set(error.error?.error?.message ?? 'Unable to save draft.');
      },
    });
  }
}

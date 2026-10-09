import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Api, type Result } from './api';
import { CategoryRecord, SupplierRecord, ProductRecord } from './catalog-types';

@Component({
  selector: 'app-product-editor',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <a routerLink="/products">Back to products</a>
    <h2>{{ id ? 'Edit product' : 'Create product' }}</h2>
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
    @if (loading()) {
      <p role="status">Loading catalog choices…</p>
    }
    <form class="panel" [formGroup]="form" (ngSubmit)="save()">
      <div class="form-grid">
        <div><label for="sku">SKU</label><input id="sku" formControlName="sku" /></div>
        <div>
          <label for="product-name">Name</label><input id="product-name" formControlName="name" />
        </div>
        <div>
          <label for="category">Category</label
          ><select id="category" formControlName="categoryId">
            <option value="">Choose category</option>
            @for (category of categories(); track category._id) {
              <option [value]="category._id">{{ category.name }}</option>
            }
          </select>
        </div>
        <div>
          <label for="supplier">Supplier</label
          ><select id="supplier" formControlName="supplierId">
            <option value="">Choose supplier</option>
            @for (supplier of suppliers(); track supplier._id) {
              <option [value]="supplier._id">{{ supplier.name }}</option>
            }
          </select>
        </div>
        <div>
          <label for="price">Unit price (USD cents)</label
          ><input id="price" type="number" min="0" step="1" formControlName="unitPriceCents" />
        </div>
        <div>
          <label for="reorder">Reorder level</label
          ><input id="reorder" type="number" min="0" step="1" formControlName="reorderLevel" />
        </div>
        <div>
          <label for="product-active">Activity</label
          ><select id="product-active" formControlName="active">
            <option [ngValue]="true">Active</option>
            <option [ngValue]="false">Inactive</option>
          </select>
        </div>
      </div>
      <label for="description">Description</label
      ><textarea id="description" formControlName="description"></textarea>
      @if (form.touched && form.invalid) {
        <p class="error">Complete required fields with whole, non-negative cents and quantities.</p>
      }
      <div class="actions">
        <button type="submit" [disabled]="busy() || loading()">
          {{ busy() ? 'Saving…' : 'Save product' }}
        </button>
      </div>
    </form>
  `,
})
export class ProductEditor {
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id');
  readonly categories = signal<CategoryRecord[]>([]);
  readonly suppliers = signal<SupplierRecord[]>([]);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly loading = signal(true);
  readonly form = inject(FormBuilder).nonNullable.group({
    sku: ['', [Validators.required, Validators.maxLength(64)]],
    name: ['', [Validators.required, Validators.maxLength(150)]],
    description: [''],
    categoryId: ['', Validators.required],
    supplierId: ['', Validators.required],
    unitPriceCents: [
      0,
      [
        Validators.required,
        Validators.min(0),
        Validators.max(100000000),
        Validators.pattern(/^\d+$/),
      ],
    ],
    reorderLevel: [
      5,
      [
        Validators.required,
        Validators.min(0),
        Validators.max(1000000),
        Validators.pattern(/^\d+$/),
      ],
    ],
    active: [true],
  });
  constructor() {
    void this.initialize();
  }
  private async initialize() {
    try {
      const [categories, suppliers] = await Promise.all([
        this.api.all<CategoryRecord>('categories'),
        this.api.all<SupplierRecord>('suppliers'),
      ]);
      this.categories.set(categories);
      this.suppliers.set(suppliers);
      if (this.id) {
        const result = await firstValueFrom(
          this.api.get<Result<ProductRecord>>(`products/${this.id}`),
        );
        this.form.patchValue({ ...result.data, sku: result.data.skuNormalized });
      }
    } catch {
      this.error.set('Unable to load product choices. Reload this page to retry.');
    } finally {
      this.loading.set(false);
    }
  }
  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set('');
    const operation = this.id
      ? this.api.patch<Result<ProductRecord>>(`products/${this.id}`, this.form.getRawValue())
      : this.api.post<Result<ProductRecord>>('products', this.form.getRawValue());
    operation.subscribe({
      next: (response) => void this.router.navigate(['/products', response.data._id]),
      error: (error: HttpErrorResponse) => {
        this.busy.set(false);
        this.error.set(error.error?.error?.message ?? 'Unable to save product.');
      },
    });
  }
}

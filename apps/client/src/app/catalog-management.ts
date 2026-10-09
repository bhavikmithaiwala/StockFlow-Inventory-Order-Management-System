import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Api, type Page } from './api';
import { CategoryRecord, SupplierRecord } from './catalog-types';
import { SessionState } from './session';

@Component({
  selector: 'app-catalog-management',
  imports: [ReactiveFormsModule],
  template: `
    <h2>{{ kind === 'categories' ? 'Categories' : 'Suppliers' }}</h2>
    @if (loading()) {
      <p role="status">Loading records…</p>
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
            {{
              kind
            }}
          </caption>
          <thead>
            <tr>
              <th>Name</th>
              @if (kind === 'suppliers') {
                <th>Contact</th>
              }
              <th>Activity</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (item of page.data; track item._id) {
              <tr>
                <td>{{ item.name }}</td>
                @if (kind === 'suppliers') {
                  <td>{{ contact(item) }}</td>
                }
                <td>{{ item.active ? 'Active' : 'Inactive' }}</td>
                <td>
                  @if (session.user()?.role === 'admin') {
                    <button type="button" (click)="edit(item)">Edit {{ item.name }}</button>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="4">
                  No records yet. An administrator can create the first one below.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <div class="actions">
        <button
          type="button"
          [disabled]="loading() || page.meta.page === 1"
          (click)="load(page.meta.page - 1)"
        >
          Previous</button
        ><span>Page {{ page.meta.page }}</span
        ><button
          type="button"
          [disabled]="loading() || page.meta.page * page.meta.limit >= page.meta.total"
          (click)="load(page.meta.page + 1)"
        >
          Next
        </button>
      </div>
    }
    @if (session.user()?.role === 'admin') {
      <form class="panel" [formGroup]="form" (ngSubmit)="save()">
        <h3>{{ selected ? 'Edit record' : 'Create record' }}</h3>
        <div class="form-grid">
          <div>
            <label for="catalog-name">Name</label><input id="catalog-name" formControlName="name" />
          </div>
          <div>
            <label for="catalog-active">Activity</label
            ><select id="catalog-active" formControlName="active">
              <option [ngValue]="true">Active</option>
              <option [ngValue]="false">Inactive</option>
            </select>
          </div>
          @if (kind === 'suppliers') {
            <div>
              <label for="contact-name">Contact name</label
              ><input id="contact-name" formControlName="contactName" />
            </div>
            <div>
              <label for="contact-email">Email</label
              ><input id="contact-email" type="email" formControlName="email" />
            </div>
            <div>
              <label for="contact-phone">Phone</label
              ><input id="contact-phone" type="tel" formControlName="phone" />
            </div>
            <div>
              <label for="contact-address">Address</label
              ><textarea id="contact-address" formControlName="address"></textarea>
            </div>
          }
        </div>
        @if (form.touched && form.invalid) {
          <p class="error">Enter a name and a valid contact email if provided.</p>
        }
        <div class="actions">
          <button type="submit" [disabled]="saving()">Save</button
          ><button type="button" (click)="reset()">New record</button>
        </div>
      </form>
    }
  `,
})
export class CatalogManagement {
  private readonly api = inject(Api);
  readonly session = inject(SessionState);
  readonly kind = inject(ActivatedRoute).snapshot.data['kind'] as 'categories' | 'suppliers';
  readonly result = signal<Page<CategoryRecord | SupplierRecord> | null>(null);
  readonly error = signal('');
  readonly loading = signal(false);
  readonly saving = signal(false);
  selected = '';
  readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    active: [true],
    contactName: [''],
    email: ['', Validators.email],
    phone: [''],
    address: [''],
  });
  constructor() {
    this.load(1);
  }
  contact(item: CategoryRecord | SupplierRecord) {
    return 'email' in item
      ? [item.contactName, item.email, item.phone].filter(Boolean).join(' · ')
      : '';
  }
  load(page: number) {
    this.loading.set(true);
    this.error.set('');
    this.api.get<Page<CategoryRecord | SupplierRecord>>(this.kind, { page }).subscribe({
      next: (result) => {
        this.result.set(result);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load records. Try again.');
        this.loading.set(false);
      },
    });
  }
  edit(item: CategoryRecord | SupplierRecord) {
    this.selected = item._id;
    this.form.reset();
    this.form.patchValue(item);
  }
  reset() {
    this.selected = '';
    this.form.reset({ active: true });
  }
  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const input = this.kind === 'categories' ? { name: value.name, active: value.active } : value;
    this.saving.set(true);
    this.error.set('');
    const operation = this.selected
      ? this.api.patch(`${this.kind}/${this.selected}`, input)
      : this.api.post(this.kind, input);
    operation.subscribe({
      next: () => {
        this.saving.set(false);
        this.reset();
        this.load(1);
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.error.set(error.error?.error?.message ?? 'Unable to save record.');
      },
    });
  }
}

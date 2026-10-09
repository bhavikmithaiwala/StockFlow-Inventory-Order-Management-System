import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Api, type Page } from './api';
interface UserRecord {
  _id: string;
  name: string;
  emailNormalized: string;
  role: 'admin' | 'staff';
  active: boolean;
}
@Component({
  selector: 'app-users',
  imports: [ReactiveFormsModule],
  template: `
    <h2>Users</h2>
    <p>
      Only administrators can manage accounts. Administrator deactivation and demotion are protected
      in this version.
    </p>
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
    @if (loading()) {
      <p role="status">Loading accounts…</p>
    }
    @if (result(); as page) {
      <div class="panel table-scroll">
        <table>
          <caption>
            {{
              page.meta.total
            }}
            accounts
          </caption>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Activity</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            @for (user of page.data; track user._id) {
              <tr>
                <td>{{ user.name }}</td>
                <td>{{ user.emailNormalized }}</td>
                <td>{{ user.role }}</td>
                <td>{{ user.active ? 'Active' : 'Inactive' }}</td>
                <td>
                  <button type="button" (click)="edit(user)">Edit {{ user.name }}</button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5">No accounts found.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <div class="actions">
        <button (click)="load(page.meta.page - 1)" [disabled]="page.meta.page <= 1">Previous</button
        ><span>Page {{ page.meta.page }}</span
        ><button
          (click)="load(page.meta.page + 1)"
          [disabled]="page.meta.page * page.meta.limit >= page.meta.total"
        >
          Next
        </button>
      </div>
    }
    <form class="panel" [formGroup]="form" (ngSubmit)="save()">
      <h3>{{ selected ? 'Edit account' : 'Create account' }}</h3>
      <div class="form-grid">
        <div>
          <label for="user-name">Name</label><input id="user-name" formControlName="name" />
        </div>
        <div>
          <label for="user-email">Email</label
          ><input id="user-email" type="email" formControlName="email" [readOnly]="!!selected" />
        </div>
        <div>
          <label for="user-role">Role</label
          ><select id="user-role" formControlName="role">
            <option value="staff">Staff</option>
            <option value="admin">Administrator</option>
          </select>
        </div>
        @if (!selected) {
          <div>
            <label for="user-password">Initial password (12–128 characters)</label
            ><input
              id="user-password"
              type="password"
              autocomplete="new-password"
              formControlName="password"
            />
          </div>
        } @else {
          <div>
            <label for="user-active">Activity</label
            ><select id="user-active" formControlName="active">
              <option [ngValue]="true">Active</option>
              <option [ngValue]="false">Inactive</option>
            </select>
          </div>
        }
      </div>
      <div class="actions">
        <button type="submit" [disabled]="busy() || form.invalid">Save account</button
        ><button type="button" (click)="reset()">New account</button>
      </div>
    </form>
  `,
})
export class Users {
  private readonly api = inject(Api);
  readonly result = signal<Page<UserRecord> | null>(null);
  readonly error = signal('');
  readonly loading = signal(false);
  readonly busy = signal(false);
  selected = '';
  readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(128)]],
    role: ['staff'],
    active: [true],
  });
  constructor() {
    this.load(1);
  }
  load(page: number) {
    this.loading.set(true);
    this.api.get<Page<UserRecord>>('users', { page }).subscribe({
      next: (result) => {
        this.result.set(result);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Unable to load accounts.');
      },
    });
  }
  edit(user: UserRecord) {
    this.selected = user._id;
    this.form.patchValue({ ...user, email: user.emailNormalized, password: '' });
    this.form.controls.password.clearValidators();
    this.form.controls.password.updateValueAndValidity();
  }
  reset() {
    this.selected = '';
    this.form.reset({ role: 'staff', active: true });
    this.form.controls.password.setValidators([
      Validators.required,
      Validators.minLength(12),
      Validators.maxLength(128),
    ]);
    this.form.controls.password.updateValueAndValidity();
  }
  save() {
    if (this.form.invalid) return;
    this.busy.set(true);
    this.error.set('');
    const value = this.form.getRawValue();
    const operation = this.selected
      ? this.api.patch(`users/${this.selected}`, {
          name: value.name,
          role: value.role,
          active: value.active,
        })
      : this.api.post('users', {
          name: value.name,
          email: value.email,
          password: value.password,
          role: value.role,
        });
    operation.subscribe({
      next: () => {
        this.busy.set(false);
        this.reset();
        this.load(1);
      },
      error: (error: HttpErrorResponse) => {
        this.busy.set(false);
        this.error.set(error.error?.error?.message ?? 'Unable to save account.');
      },
    });
  }
}

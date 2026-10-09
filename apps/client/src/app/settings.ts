import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SessionState } from './session';
@Component({
  selector: 'app-settings',
  imports: [ReactiveFormsModule],
  template: `
    <h2>Profile and preferences</h2>
    <p>{{ session.user()?.email }} · {{ session.user()?.role }}</p>
    <form class="panel" [formGroup]="form" (ngSubmit)="save()">
      <label for="profile-name">Display name</label
      ><input id="profile-name" formControlName="name" /><label for="page-size"
        >Catalog and order page size</label
      ><select id="page-size" formControlName="pageSize">
        <option [ngValue]="10">10</option>
        <option [ngValue]="20">20</option>
        <option [ngValue]="50">50</option>
        <option [ngValue]="100">100</option>
      </select>
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
      @if (saved()) {
        <p role="status">Preferences saved.</p>
      }
      <div class="actions">
        <button type="submit" [disabled]="busy() || form.invalid">Save profile</button>
      </div>
    </form>
  `,
})
export class Settings {
  readonly session = inject(SessionState);
  readonly error = signal('');
  readonly saved = signal(false);
  readonly busy = signal(false);
  readonly form = inject(FormBuilder).nonNullable.group({
    name: [this.session.user()?.name ?? '', [Validators.required, Validators.maxLength(100)]],
    pageSize: [this.session.user()?.preferences?.pageSize ?? 20],
  });
  save() {
    if (this.form.invalid) return;
    this.busy.set(true);
    this.saved.set(false);
    this.error.set('');
    const value = this.form.getRawValue();
    this.session
      .updateProfile({ name: value.name, preferences: { pageSize: value.pageSize } })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.saved.set(true);
        },
        error: () => {
          this.busy.set(false);
          this.error.set('Unable to save profile. Try again.');
        },
      });
  }
}

import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  template: `
    <h2>Sign in</h2>
    <p>Use the account your warehouse administrator created.</p>
    <form class="panel" [formGroup]="form" (ngSubmit)="submit()" style="max-width: 480px">
      <label for="email">Email</label>
      <input id="email" type="email" autocomplete="username" formControlName="email" />
      @if (form.controls.email.touched && form.controls.email.invalid) {
        <p class="error">Enter a valid email address.</p>
      }
      <label for="password">Password</label>
      <input
        id="password"
        type="password"
        autocomplete="current-password"
        formControlName="password"
      />
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
      <div class="actions">
        <button type="submit" [disabled]="busy()">{{ busy() ? 'Signing in…' : 'Sign in' }}</button>
      </div>
    </form>
  `,
})
export class Login {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.maxLength(128)]],
  });
  readonly busy = signal(false);
  readonly error = signal('');
  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.http.post('/api/auth/login', this.form.getRawValue()).subscribe({
      next: () => {
        this.busy.set(false);
        void this.router.navigateByUrl('/');
      },
      error: (error: HttpErrorResponse) => {
        this.busy.set(false);
        this.error.set(
          error.error?.error?.message ?? 'Unable to sign in. Check the API connection.',
        );
      },
    });
  }
}

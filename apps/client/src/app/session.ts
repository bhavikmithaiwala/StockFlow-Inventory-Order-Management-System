import { Injectable, inject, signal } from '@angular/core';
import { tap } from 'rxjs';
import { Api, type Result } from './api';

export interface CurrentUser {
  preferences?: { pageSize: number };
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff';
}
@Injectable({ providedIn: 'root' })
export class SessionState {
  updateProfile(input: { name: string; preferences: { pageSize: number } }) {
    return this.api
      .patch<Result<CurrentUser>>('auth/profile', input)
      .pipe(tap((response) => this.user.set(response.data)));
  }
  private readonly api = inject(Api);
  readonly user = signal<CurrentUser | null>(null);
  load() {
    return this.api
      .get<Result<CurrentUser>>('auth/me')
      .pipe(tap((response) => this.user.set(response.data)));
  }
  login(input: { email: string; password: string }) {
    return this.api
      .post<Result<CurrentUser>>('auth/login', input)
      .pipe(tap((response) => this.user.set(response.data)));
  }
  logout() {
    return this.api.post<void>('auth/logout', {}).pipe(tap(() => this.user.set(null)));
  }
}

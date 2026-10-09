import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-overview',
  template: `
    <h2>System overview</h2>
    <p>Check the API connection before signing in to your warehouse.</p>
    <section class="panel" aria-labelledby="connection-heading">
      <h3 id="connection-heading">API connection</h3>
      <p role="status">{{ status() }}</p>
      <button type="button" (click)="check()" [disabled]="loading()">Check connection</button>
    </section>
  `,
})
export class Overview {
  private readonly http = inject(HttpClient);
  readonly status = signal('Checking connection…');
  readonly loading = signal(false);

  constructor() {
    this.check();
  }
  check() {
    this.loading.set(true);
    this.status.set('Checking connection…');
    this.http.get<{ data: { status: string } }>('/api/health').subscribe({
      next: (response) => {
        this.status.set(
          response.data.status === 'ok' ? 'API is reachable' : 'API reported an unexpected status',
        );
        this.loading.set(false);
      },
      error: () => {
        this.status.set('API unavailable. Start the API and try again.');
        this.loading.set(false);
      },
    });
  }
}

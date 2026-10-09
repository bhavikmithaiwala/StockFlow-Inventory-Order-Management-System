import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { SessionState } from './session';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly logoutError = signal('');
  readonly session = inject(SessionState);
  private readonly router = inject(Router);
  logout() {
    this.logoutError.set('');
    this.session.logout().subscribe({
      next: () => void this.router.navigateByUrl('/login'),
      error: () => {
        this.logoutError.set('Sign-out could not be confirmed. Check the connection and retry.');
      },
    });
  }
}

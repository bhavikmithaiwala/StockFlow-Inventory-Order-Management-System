import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { SessionState } from './session';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly session = inject(SessionState);
  private readonly router = inject(Router);
  logout() {
    this.session.logout().subscribe({
      next: () => void this.router.navigateByUrl('/login'),
      error: () => {
        this.session.user.set(null);
        void this.router.navigateByUrl('/login');
      },
    });
  }
}

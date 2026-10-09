import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login').then((m) => m.Login),
    title: 'Sign in | StockFlow',
  },
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./overview').then((m) => m.Overview),
    title: 'System overview | StockFlow',
  },
  { path: '**', redirectTo: '' },
];

import { Routes } from '@angular/router';
import { authenticated } from './auth-guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login').then((m) => m.Login),
    title: 'Sign in | StockFlow',
  },
  {
    path: '',
    canActivate: [authenticated],
    pathMatch: 'full',
    loadComponent: () => import('./overview').then((m) => m.Overview),
    title: 'System overview | StockFlow',
  },
  {
    path: 'status',
    loadComponent: () => import('./overview').then((m) => m.Overview),
    title: 'Connection | StockFlow',
  },
  { path: '**', redirectTo: '' },
];

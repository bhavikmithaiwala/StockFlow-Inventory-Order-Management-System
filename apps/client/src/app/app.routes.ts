import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./overview').then((m) => m.Overview),
    title: 'System overview | StockFlow',
  },
  { path: '**', redirectTo: '' },
];

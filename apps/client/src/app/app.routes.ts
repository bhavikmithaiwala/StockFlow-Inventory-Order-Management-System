import { Routes } from '@angular/router';
import { authenticated } from './auth-guard';

export const routes: Routes = [
  {
    path: 'products',
    canActivate: [authenticated],
    loadComponent: () => import('./product-list').then((m) => m.ProductList),
    title: 'Products | StockFlow',
  },
  {
    path: 'products/:id',
    canActivate: [authenticated],
    loadComponent: () => import('./product-detail').then((m) => m.ProductDetail),
    title: 'Product | StockFlow',
  },
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

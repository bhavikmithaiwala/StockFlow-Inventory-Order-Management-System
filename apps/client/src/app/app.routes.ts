import { Routes } from '@angular/router';
import { authenticated } from './auth-guard';

export const routes: Routes = [
  {
    path: 'reports',
    canActivate: [authenticated],
    loadComponent: () => import('./reports').then((m) => m.Reports),
    title: 'Reports | StockFlow',
  },
  {
    path: 'orders/new',
    canActivate: [authenticated],
    loadComponent: () => import('./order-editor').then((m) => m.OrderEditor),
    title: 'Create order | StockFlow',
  },
  {
    path: 'orders/:id/edit',
    canActivate: [authenticated],
    loadComponent: () => import('./order-editor').then((m) => m.OrderEditor),
    title: 'Edit draft | StockFlow',
  },
  {
    path: 'orders',
    canActivate: [authenticated],
    loadComponent: () => import('./order-list').then((m) => m.OrderList),
    title: 'Orders | StockFlow',
  },
  {
    path: 'orders/:id',
    canActivate: [authenticated],
    loadComponent: () => import('./order-detail').then((m) => m.OrderDetail),
    title: 'Order | StockFlow',
  },
  {
    path: 'movements',
    canActivate: [authenticated],
    loadComponent: () => import('./movements').then((m) => m.Movements),
    title: 'Movements | StockFlow',
  },
  {
    path: 'inventory',
    canActivate: [authenticated],
    loadComponent: () => import('./inventory-form').then((m) => m.InventoryForm),
    title: 'Inventory | StockFlow',
  },
  {
    path: 'categories',
    data: { kind: 'categories' },
    canActivate: [authenticated],
    loadComponent: () => import('./catalog-management').then((m) => m.CatalogManagement),
    title: 'Categories | StockFlow',
  },
  {
    path: 'suppliers',
    data: { kind: 'suppliers' },
    canActivate: [authenticated],
    loadComponent: () => import('./catalog-management').then((m) => m.CatalogManagement),
    title: 'Suppliers | StockFlow',
  },
  {
    path: 'products/new',
    canActivate: [authenticated],
    loadComponent: () => import('./product-editor').then((m) => m.ProductEditor),
    title: 'Create product | StockFlow',
  },
  {
    path: 'products/:id/edit',
    canActivate: [authenticated],
    loadComponent: () => import('./product-editor').then((m) => m.ProductEditor),
    title: 'Edit product | StockFlow',
  },
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
    loadComponent: () => import('./dashboard').then((m) => m.Dashboard),
    title: 'Dashboard | StockFlow',
  },
  {
    path: 'status',
    loadComponent: () => import('./overview').then((m) => m.Overview),
    title: 'Connection | StockFlow',
  },
  { path: '**', redirectTo: '' },
];

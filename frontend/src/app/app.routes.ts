import { Routes } from '@angular/router';
import { Products } from './pages/products/products';
import { authGuard } from './guards/auth-guard';
import { adminGuard } from './guards/admin-guard';
import { customerGuard } from './guards/customer-guard';

export const routes: Routes = [
  { path: '', component: Products },
  { path: 'verify-email', loadComponent: () => import('./pages/verify-email/verify-email').then((m) => m.VerifyEmail) },
  { path: 'reset-password', loadComponent: () => import('./pages/reset-password/reset-password').then((m) => m.ResetPassword) },
  { path: 'products', component: Products },
  { path: 'product/:id', loadComponent: () => import('./pages/product-detail/product-detail').then((m) => m.ProductDetail) },
  { path: 'cart', loadComponent: () => import('./pages/cart/cart').then((m) => m.Cart), canActivate: [authGuard, customerGuard] },
  { path: 'checkout', loadComponent: () => import('./pages/checkout/checkout').then((m) => m.Checkout), canActivate: [authGuard, customerGuard] },
  { path: 'order-confirmation/:id', loadComponent: () => import('./pages/order-confirmation/order-confirmation').then((m) => m.OrderConfirmation), canActivate: [authGuard, customerGuard] },
  { path: 'orders', loadComponent: () => import('./pages/orders/orders').then((m) => m.Orders), canActivate: [authGuard] },
  { path: 'orders/:id', loadComponent: () => import('./pages/order-details/order-details').then((m) => m.OrderDetails), canActivate: [authGuard] },
  { path: 'wishlist', loadComponent: () => import('./pages/wishlist/wishlist').then((m) => m.Wishlist), canActivate: [authGuard, customerGuard] },
  { path: 'profile', loadComponent: () => import('./pages/profile/profile').then((m) => m.Profile), canActivate: [authGuard] },
  { path: 'deals', loadComponent: () => import('./pages/deals/deals').then((m) => m.Deals) },
  { path: 'admin/products', loadComponent: () => import('./pages/admin-products/admin-products').then((m) => m.AdminProducts), canActivate: [adminGuard] },
  { path: 'admin/users', loadComponent: () => import('./pages/admin-users/admin-users').then((m) => m.AdminUsers), canActivate: [adminGuard] },
  { path: 'admin/chat', loadComponent: () => import('./pages/admin-chat/admin-chat').then((m) => m.AdminChat), canActivate: [adminGuard] },
  { path: 'admin/stats', loadComponent: () => import('./pages/admin-stats/admin-stats').then((m) => m.AdminStats), canActivate: [adminGuard] },
  { path: '**', loadComponent: () => import('./pages/not-found/not-found').then((m) => m.NotFound) },
];

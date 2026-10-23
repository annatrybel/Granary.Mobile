import { Routes } from '@angular/router';
import { adminGuard } from './guards/admin.guard';
import { AdminLayoutComponent } from './layout/admin-layout.component';

export const ADMIN_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/admin-login.component').then(m => m.AdminLoginComponent)
  },

  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [adminGuard],
    children: [
      {
        path: '',
        redirectTo: 'users',
        pathMatch: 'full'
      },
      {
        path: 'users',
        loadComponent: () => import('./users/admin-users.component').then(m => m.AdminUsersComponent)
      },
      {
        path: 'products',
        loadComponent: () => import('./products/admin-products.component').then(m => m.AdminProductsComponent)
      },
      {
        path: 'dashboard',
        redirectTo: 'users'
      },
      {
        path: 'recipes',
        loadComponent: () => import('./recipes/admin-recipes.component').then(m => m.AdminRecipesComponent)
      }
    ]
  }
];
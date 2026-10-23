import { Routes } from '@angular/router';
import { UserLayoutComponent } from './layout/user-layout.component';

export const USER_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'pulpit',
    pathMatch: 'full'
  },

  {
    path: 'auth',
    loadComponent: () => import('./auth/auth.component').then(m => m.AuthComponent)
  },
  {
    path: 'login',
    redirectTo: 'auth'
  },
  {
    path: 'profil',
    loadComponent: () => import('./profile/profile.component').then(m => m.ProfileComponent)
  },

  {
    path: '',
    component: UserLayoutComponent, 
    children: [
      {
        path: 'pulpit',
        loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'magazyn',
        loadComponent: () => import('./inventory/inventory.component').then(m => m.InventoryComponent)
      },
      {
        path: 'przepisy',
        loadComponent: () => import('./recipes/recipes.component').then(m => m.RecipesComponent)
      },
      {
        path: 'zakupy',
        loadComponent: () => import('./shopping-list/shopping-list.component').then(m => m.ShoppingListComponent)
      }
    ]
  }
];
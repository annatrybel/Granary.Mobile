import { Routes } from '@angular/router';
import { AuthComponent } from './features/auth/auth.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { InventoryComponent } from './features/inventory/inventory.component';
import { RecipesComponent } from './features/recipes/recipes.component';
import { ShoppingListComponent } from './features/shopping-list/shopping-list.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'auth',
    pathMatch: 'full'
  },

  {
    path: 'auth',
    component: AuthComponent 
  },

  {    
    path: 'login',
    redirectTo: 'auth'
  },

  {
    path: 'pulpit',
    component: DashboardComponent 
  },

  {
    path: 'magazyn',
    component: InventoryComponent
  },

  {
    path: 'przepisy',
    component: RecipesComponent
  },

  {
    path: 'zakupy',
    component: ShoppingListComponent
  },

  {
    path: '**',
    redirectTo: 'auth'
  }
];
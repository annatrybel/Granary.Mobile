import {
  ApplicationConfig,
  importProvidersFrom,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { authInterceptor } from '@granary/shared';
import {
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  LogOut,
  LucideAngularModule,
  Package,
  Pencil,
  Plus,
  Refrigerator,
  Search,
  ShoppingBasket,
  Sprout,
  Star,
  Trash2,
  Users,
} from 'lucide-angular';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    importProvidersFrom(
      LucideAngularModule.pick({
        BookOpen,
        ChevronDown,
        ChevronLeft,
        ChevronRight,
        Clock,
        Download,
        LogOut,
        Package,
        Pencil,
        Plus,
        Refrigerator,
        Search,
        ShoppingBasket,
        Sprout,
        Star,
        Trash2,
        Users,
      }),
    ),
  ],
};

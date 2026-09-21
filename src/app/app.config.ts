import { 
  ApplicationConfig, 
  provideBrowserGlobalErrorListeners, 
  isDevMode, 
  importProvidersFrom 
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor'; // <-- DODANE

import { 
  LucideAngularModule, 
  // Główne menu i magazyn:
  Home, 
  Package, 
  BookOpen, 
  ShoppingBasket, 
  Search, 
  Plus, 
  Trash2, 
  Clock, 
  Camera,   
  Check,   
  Sparkles,
  // Formularze i logowanie:
  Refrigerator, 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  LogIn, 
  UserPlus 
} from 'lucide-angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // Rejestracja interceptora JWT:
    provideHttpClient(
      withInterceptors([authInterceptor])
    ),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),

    importProvidersFrom(
      LucideAngularModule.pick({
        Home,
        Package,
        BookOpen,
        ShoppingBasket,
        Search,
        Plus,
        Trash2,
        Clock,
        Camera,  
        Check,   
        Sparkles, 
        Refrigerator,
        User,
        Mail,
        Lock,
        Eye,
        EyeOff,
        LogIn,
        UserPlus
      })
    )
  ],
};

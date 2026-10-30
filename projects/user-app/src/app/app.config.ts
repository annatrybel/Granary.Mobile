import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideAppInitializer,
  inject,
  isDevMode
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import { routes } from './app.routes';
import { authInterceptor, provideAppConfig, LOGOUT_CLEANUP } from '@granary/shared';
import { AppDatabase } from './core/db/app-database';
import { SyncService } from './core/services/sync.service';
import { ThemeService } from './core/services/theme.service';
import { PwaInstallService } from './core/services/pwa-install.service';
import { ProfilePreferencesService } from './core/services/profile-preferences.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAppConfig(),
    // Czyści dane offline poprzedniego użytkownika (w tym kolejkę synchronizacji) przy wylogowaniu.
    {
      provide: LOGOUT_CLEANUP,
      multi: true,
      useFactory: () => {
        const db = inject(AppDatabase);
        return async () => {
          await db.delete();
          await db.open();
        };
      }
    },
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor])
    ),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideAppInitializer(() => {
      inject(ThemeService);
      inject(ProfilePreferencesService);
      inject(SyncService);
      inject(PwaInstallService);
    }),
  ],
};

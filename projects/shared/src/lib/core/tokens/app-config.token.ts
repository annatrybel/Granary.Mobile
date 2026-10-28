import { EnvironmentProviders, InjectionToken, inject, provideAppInitializer } from '@angular/core';

export interface AppConfig {
  /**
   * Origin of the backend (e.g. https://api.example.com). Empty means "same origin as the frontend",
   * which is what the dev-server proxy and same-origin hosting use.
   */
  backendOrigin: string;
}

export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG', {
  providedIn: 'root',
  factory: () => ({ backendOrigin: '' }),
});

/** Loads /config.json at startup so the backend address can change without rebuilding the app. */
export function provideAppConfig(url = '/config.json'): EnvironmentProviders {
  return provideAppInitializer(async () => {
    const config = inject(APP_CONFIG);
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (response.ok) {
        const loaded = (await response.json()) as Partial<AppConfig>;
        config.backendOrigin = (loaded.backendOrigin ?? '').replace(/\/+$/, '');
      }
    } catch {
      // Keep defaults (same origin) when the config is unavailable, e.g. when offline.
    }
  });
}

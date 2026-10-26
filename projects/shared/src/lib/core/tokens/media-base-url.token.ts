import { InjectionToken } from '@angular/core';

export const MEDIA_BASE_URL = new InjectionToken<string>('MEDIA_BASE_URL', {
  providedIn: 'root',
  factory: () => '/uploads',
});

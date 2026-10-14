// src/app/core/interceptors/auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.startsWith(environment.apiBaseUrl)) {
    const authService = inject(AuthService);
    const token = authService.getToken();

    const currentLang = typeof localStorage !== 'undefined' 
      ? (localStorage.getItem('granary_lang') || 'pl') 
      : 'pl';

    const headers: Record<string, string> = {
      'Accept-Language': currentLang
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    req = req.clone({
      setHeaders: headers,
      params: req.params.has('lang') ? req.params : req.params.set('lang', currentLang)
    });
  }

  return next(req);
};
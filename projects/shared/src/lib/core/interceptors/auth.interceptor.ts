import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_BASE_URL } from '../tokens/api-base-url.token';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const apiBaseUrl = inject(API_BASE_URL);

  if (req.url.startsWith(apiBaseUrl)) {
    const authService = inject(AuthService);
    const token = authService.getToken();
    const currentLang =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('granary_lang') || 'pl'
        : 'pl';

    const headers: Record<string, string> = {
      'Accept-Language': currentLang,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    req = req.clone({
      setHeaders: headers,
      params: req.params.has('lang')
        ? req.params
        : req.params.set('lang', currentLang),
    });
  }

  return next(req);
};

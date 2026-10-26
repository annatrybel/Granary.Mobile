import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let httpTestingController: HttpTestingController;
  let httpClient: HttpClient;
  let authService: AuthService;

  beforeEach(() => {
    localStorage.removeItem('granary_token');

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpTestingController.verify();
    localStorage.removeItem('granary_token');
  });

  it('adds the saved bearer token to API requests', () => {
    authService.setToken('test-access-token');

    httpClient.get('/api/profile/me').subscribe();

    const request = httpTestingController.expectOne('/api/profile/me?lang=pl');
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer test-access-token',
    );
    expect(request.request.headers.get('Accept-Language')).toBe('pl');
    request.flush({});
  });
});

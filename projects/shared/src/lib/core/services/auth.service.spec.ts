import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AuthService } from './auth.service';

function createToken(claims: Record<string, unknown>): string {
  const payload = btoa(JSON.stringify(claims))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `header.${payload}.signature`;
}

describe('AuthService', () => {
  let authService: AuthService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    localStorage.removeItem('granary_token');

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    authService = TestBed.inject(AuthService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
    localStorage.removeItem('granary_token');
  });

  it('stores the access token returned by login', () => {
    authService.login({ email: 'user@example.com', password: 'password' }).subscribe();

    const request = httpTestingController.expectOne('/api/authentication/login');
    request.flush({ token: 'test-access-token' });

    expect(authService.getToken()).toBe('test-access-token');
    expect(localStorage.getItem('granary_token')).toBe('test-access-token');
  });

  it('clears the token on logout', () => {
    authService.setToken('test-access-token');

    authService.logout();

    expect(authService.getToken()).toBeNull();
    expect(localStorage.getItem('granary_token')).toBeNull();
  });

  it('recognizes a well-formed unexpired JWT', () => {
    authService.setToken(createToken({ exp: Math.floor(Date.now() / 1000) + 60 }));

    expect(authService.hasUnexpiredToken()).toBe(true);
  });

  it('recognizes admin roles from standard and ASP.NET role claims', () => {
    const exp = Math.floor(Date.now() / 1000) + 60;
    authService.setToken(createToken({ exp, role: 'Admin' }));
    expect(authService.hasRole('Admin')).toBe(true);

    authService.setToken(createToken({
      exp,
      'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': ['User', 'Admin'],
    }));
    expect(authService.hasRole('admin')).toBe(true);
  });

  it('rejects tokens without the requested role or with an expired role claim', () => {
    authService.setToken(createToken({ exp: Math.floor(Date.now() / 1000) + 60, role: 'User' }));
    expect(authService.hasRole('Admin')).toBe(false);

    authService.setToken(createToken({ exp: Math.floor(Date.now() / 1000) - 60, role: 'Admin' }));
    expect(authService.hasRole('Admin')).toBe(false);
  });

  it('rejects expired and malformed tokens', () => {
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 60 }));
    authService.setToken(`header.${payload}.signature`);
    expect(authService.hasUnexpiredToken()).toBe(false);

    authService.setToken('not-a-jwt');
    expect(authService.hasUnexpiredToken()).toBe(false);
  });
});

import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { API_BASE_URL } from '../tokens/api-base-url.token';

import {
  LoginDto,
  RegisterDto,
  AuthResponseDto,
  ResetPasswordDto,
} from '../../auth/auth.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  
  private readonly tokenKey = 'granary_token';
  private readonly userKey = 'granary_user';

  readonly token = signal<string | null>(localStorage.getItem(this.tokenKey));
  readonly isAuthenticated = computed<boolean>(() => !!this.token());

  readonly currentUser = signal<any | null>(this.getStoredUser());

  getToken(): string | null {
    return this.token();
  }

  hasUnexpiredToken(): boolean {
    return this.getUnexpiredTokenClaims() !== null;
  }

  hasRole(requiredRole: string): boolean {
    if (!requiredRole.trim()) return false;

    const claims = this.getUnexpiredTokenClaims();
    if (!claims) return false;

    const roleClaims = [
      claims['role'],
      claims['roles'],
      claims['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'],
      claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role'],
    ];
    const roles = roleClaims.flatMap(value =>
      typeof value === 'string'
        ? [value]
        : Array.isArray(value)
          ? value.filter((role): role is string => typeof role === 'string')
          : []
    );

    return roles.some(role => role.toLowerCase() === requiredRole.trim().toLowerCase());
  }

  private getUnexpiredTokenClaims(): Record<string, unknown> | null {
    const token = this.getToken();
    if (!token) return null;

    const parts = token.split('.');
    if (parts.length !== 3 || parts.some(part => !part)) return null;

    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = payload.padEnd(Math.ceil(payload.length / 4) * 4, '=');

    try {
      const claims: unknown = JSON.parse(atob(paddedPayload));
      if (typeof claims !== 'object' || claims === null || Array.isArray(claims)) return null;

      const tokenClaims = claims as Record<string, unknown>;
      const expiration = tokenClaims['exp'];
      return typeof expiration === 'number' &&
        Number.isFinite(expiration) &&
        expiration * 1000 > Date.now()
        ? tokenClaims
        : null;
    } catch {
      return null;
    }
  }

  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
    this.token.set(token);
  }

  saveCurrentUser(user: any): void {
    try {
      localStorage.setItem(this.userKey, JSON.stringify(user));
      this.currentUser.set(user);
    } catch (e) {
      console.error('Błąd zapisu profilu w localStorage:', e);
    }
  }

  private getStoredUser(): any | null {
    try {
      const data = localStorage.getItem(this.userKey);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  login(credentials: LoginDto): Observable<AuthResponseDto> {
    return this.http.post<AuthResponseDto>(`${this.apiBaseUrl}/authentication/login`, credentials).pipe(
      tap(response => {
        if (response?.token) {
          this.setToken(response.token);
        }
      })
    );
  }

  register(dto: RegisterDto): Observable<any> {
    return this.http.post(`${this.apiBaseUrl}/authentication/register`, dto);
  }

  requestPasswordReset(email: string): Observable<any> {
    return this.http.post(`${this.apiBaseUrl}/authentication/forgot-password`, { email });
  }

  resetPassword(dto: ResetPasswordDto): Observable<any> {
    return this.http.post(`${this.apiBaseUrl}/authentication/reset-password`, dto);
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.token.set(null);
    this.currentUser.set(null);
  }
}
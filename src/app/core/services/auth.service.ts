import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export type { 
  LoginDto, 
  RegisterDto, 
  AuthResponseDto,
  AuthMode,
  ResetPasswordDto,
  ForgotPasswordDto
} from '../../features/auth/models/auth.models';

import { 
  LoginDto, 
  RegisterDto, 
  AuthResponseDto,
  ResetPasswordDto
} from '../../features/auth/models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  
  private readonly tokenKey = 'granary_token';
  private readonly userKey = 'granary_user';

  readonly token = signal<string | null>(localStorage.getItem(this.tokenKey));
  readonly isAuthenticated = computed<boolean>(() => !!this.token());

  readonly currentUser = signal<any | null>(this.getStoredUser());

  getToken(): string | null {
    return this.token();
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
    return this.http.post<AuthResponseDto>(`${environment.apiBaseUrl}/authentication/login`, credentials).pipe(
      tap(response => {
        if (response?.token) {
          this.setToken(response.token);
        }
      })
    );
  }

  register(dto: RegisterDto): Observable<any> {
    return this.http.post(`${environment.apiBaseUrl}/authentication/register`, dto);
  }

  requestPasswordReset(email: string): Observable<any> {
    return this.http.post(`${environment.apiBaseUrl}/authentication/forgot-password`, { email });
  }

  resetPassword(dto: ResetPasswordDto): Observable<any> {
    return this.http.post(`${environment.apiBaseUrl}/authentication/reset-password`, dto);
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.token.set(null);
    this.currentUser.set(null);
  }
}
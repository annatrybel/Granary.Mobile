import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export type { 
  LoginDto, 
  RegisterDto, 
  AuthResponseDto,
  AuthMode 
} from '../../features/auth/models/auth.models';

import { 
  LoginDto, 
  RegisterDto, 
  AuthResponseDto 
} from '../../features/auth/models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private readonly tokenKey = 'granary_token';

  readonly token = signal<string | null>(localStorage.getItem(this.tokenKey));
  readonly isAuthenticated = computed<boolean>(() => !!this.token());

  getToken(): string | null {
    return this.token();
  }

  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
    this.token.set(token);
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

  requestPasswordReset(email: string): Observable<any> {
    return this.http.post(`${environment.apiBaseUrl}/authentication/forgot-password`, { email });
  }

  /** Rejestracja nowego użytkownika */
  register(dto: RegisterDto): Observable<any> {
    return this.http.post(`${environment.apiBaseUrl}/authentication/register`, dto);
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.token.set(null);
  }
}
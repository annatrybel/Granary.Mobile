// src/app/core/services/auth.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  userName: string;
}

export interface AuthResponseDto {
  token: string;
  refreshToken?: string;
  email?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private readonly tokenKey = 'granary_token';

  token = signal<string | null>(localStorage.getItem(this.tokenKey));

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

  register(dto: RegisterDto): Observable<any> {
    return this.http.post(`${environment.apiBaseUrl}/authentication/register`, dto);
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.token.set(null);
  }

  isAuthenticated(): boolean {
    return !!this.token();
  }
}
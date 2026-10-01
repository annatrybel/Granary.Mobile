export type AuthMode = 'login' | 'register';

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
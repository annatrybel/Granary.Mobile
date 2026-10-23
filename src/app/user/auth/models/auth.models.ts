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

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  email: string;
  token: string;
  newPassword: string;
}

export interface AuthSubmitPayload {
  mode: AuthMode;
  email: string;
  password: string;
  name?: string;
  rememberMe: boolean;
}
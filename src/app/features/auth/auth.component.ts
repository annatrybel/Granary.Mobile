import { Component, signal, ChangeDetectionStrategy, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';

import { AuthService } from '../../core/services/auth.service';
import { AuthMode } from './models/auth.models';
import { ForgotPasswordModalComponent } from './components/forgot-password-modal/forgot-password-modal.component';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterLink, 
    LucideAngularModule,
    ForgotPasswordModalComponent 
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss'
})
export class AuthComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  mode = signal<AuthMode>('login');
  showPassword = signal<boolean>(false);
  rememberMe = signal<boolean>(true);

  name = signal<string>('');
  email = signal<string>('');
  password = signal<string>('');

  isForgotPasswordOpen = signal<boolean>(false);

  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (token) {
      this.authService.setToken(token);
      this.router.navigate(['/pulpit']);
      return;
    }

    const errorFromUrl = this.route.snapshot.queryParamMap.get('error');
    if (errorFromUrl) {
      this.errorMessage.set(decodeURIComponent(errorFromUrl));
      this.cdr.markForCheck();
    }
  }

  setMode(newMode: AuthMode): void {
    this.mode.set(newMode);
    this.errorMessage.set(null);
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(prev => !prev);
  }

  onSubmit(): void {
    this.errorMessage.set(null);
    this.isLoading.set(true);

    if (this.mode() === 'login') {
      // LOGOWANIE
      this.authService.login({
        email: this.email(),
        password: this.password()
      }).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.router.navigate(['/pulpit']);
        },
        error: (err: HttpErrorResponse) => {
          this.isLoading.set(false);
          const msg = err.error?.message || err.error?.detail || 'Błędny adres e-mail lub hasło.';
          this.errorMessage.set(msg);
          this.cdr.markForCheck();
        }
      });
    } else {
      // REJESTRACJA
      this.authService.register({
        email: this.email(),
        password: this.password(),
        userName: this.name() || this.email()
      }).subscribe({
        next: () => {
          this.authService.login({
            email: this.email(),
            password: this.password()
          }).subscribe({
            next: () => {
              this.isLoading.set(false);
              this.router.navigate(['/pulpit']);
            },
            error: () => {
              this.isLoading.set(false);
              this.setMode('login');
              this.cdr.markForCheck();
            }
          });
        },
        error: (err: HttpErrorResponse) => {
          this.isLoading.set(false);
          const msg = err.error?.message || err.error?.errors?.[0]?.description || 'Rejestracja nie powiodła się.';
          this.errorMessage.set(msg);
          this.cdr.markForCheck();
        }
      });
    }
  }

  loginWithGoogle(): void {
    window.location.href = '/api/authentication/external-login?provider=Google';
  }

  openForgotPassword(): void {
    this.isForgotPasswordOpen.set(true);
  }

  closeForgotPassword(): void {
    this.isForgotPasswordOpen.set(false);
  }
}
import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@granary/shared';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div class="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
        
        <div class="mb-6 text-center">
          <h1 class="text-2xl font-bold text-slate-900">Panel Administratora</h1>
          <p class="text-sm text-slate-500 mt-1">Zaloguj się, aby zarządzać platformą</p>
        </div>

        @if (errorMessage()) {
          <div class="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {{ errorMessage() }}
          </div>
        }

        <form (ngSubmit)="onSubmit()" class="flex flex-col gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">E-mail</label>
            <input 
              type="email" 
              name="email"
              [(ngModel)]="email"
              required
              placeholder="admin@twojadomena.pl"
              class="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:border-[#536500] outline-none transition-all"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Hasło</label>
            <input 
              type="password" 
              name="password"
              [(ngModel)]="password"
              required
              placeholder="••••••••"
              class="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:border-[#536500] outline-none transition-all"
            />
          </div>

          <button 
            type="submit" 
            [disabled]="isLoading()"
            class="w-full h-11 bg-[#536500] hover:bg-[#435200] disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-md cursor-pointer mt-2 flex items-center justify-center">
            @if (isLoading()) {
              <span>Logowanie...</span>
            } @else {
              <span>Zaloguj się do panelu</span>
            }
          </button>
        </form>

        <div class="mt-6 text-center">
          <a routerLink="/pulpit" class="text-xs text-slate-400 hover:text-slate-700 transition-colors">
            ← Wróć do aplikacji użytkownika
          </a>
        </div>

      </div>
    </div>
  `
})
export class AdminLoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  password = '';
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  onSubmit(): void {
    if (!this.email || !this.password) {
      this.errorMessage.set('Wprowadź adres e-mail i hasło.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: (response) => {
        this.isLoading.set(false);

        if (!this.authService.hasRole('Administrator')) {
          this.authService.logout();
          this.errorMessage.set('To konto nie ma uprawnień do panelu administratora.');
          return;
        }

        this.router.navigate(['/users']);
      },
      error: (err) => {
        this.isLoading.set(false);
        const backendMessage = err?.error?.message || err?.error?.title;
        this.errorMessage.set(backendMessage || 'Nieprawidłowy login lub hasło.');
      }
    });
  }
}
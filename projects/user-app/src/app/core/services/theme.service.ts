import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { ProfileService } from '@granary/shared';

export type ThemeMode = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly STORAGE_KEY = 'granary_theme';
  private readonly profileService = inject(ProfileService);

  readonly currentMode = signal<ThemeMode>(this.getInitialMode());

  private readonly systemPrefersDark = signal<boolean>(
    typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  readonly isDark = computed(() => {
    const mode = this.currentMode();
    if (mode === 'system') {
      return this.systemPrefersDark();
    }
    return mode === 'dark';
  });

  constructor() {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      window.matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', (event) => this.systemPrefersDark.set(event.matches));
    }

    effect(() => {
      const darkActive = this.isDark();
      const mode = this.currentMode();

      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', darkActive);
      }

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.STORAGE_KEY, mode);
      }
    });
  }

  setTheme(mode: ThemeMode, syncBackend = true): void {
    this.currentMode.set(mode);

    if (syncBackend) {
      const isDark = mode === 'dark' || (mode === 'system' && this.systemPrefersDark());
      this.profileService.updateDarkMode(isDark).subscribe({
        error: (err) => console.warn('Brak połączenia z API, motyw zapisany tylko lokalnie', err)
      });
    }
  }

  private getInitialMode(): ThemeMode {
    if (typeof window === 'undefined') return 'system';
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
  }
}
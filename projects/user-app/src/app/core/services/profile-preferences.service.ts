import { Injectable, effect, inject } from '@angular/core';
import { Observable, finalize, map, shareReplay, tap } from 'rxjs';
import { AuthService, ProfileService, UserProfileDto, TranslationService } from '@granary/shared';
import { ThemeService } from './theme.service';

@Injectable({ providedIn: 'root' })
export class ProfilePreferencesService {
  private readonly authService = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly themeService = inject(ThemeService);
  private readonly translationService = inject(TranslationService);

  private profileRequest?: Observable<UserProfileDto>;
  private profileRequestToken: string | null = null;

  constructor() {
    effect(() => {
      if (this.authService.token()) {
        this.getProfile().subscribe({
          error: error => console.warn('Nie udało się pobrać preferencji profilu:', error)
        });
      }
    });
  }

  getProfile(): Observable<UserProfileDto> {
    const requestToken = this.authService.getToken();
    if (!this.profileRequest || this.profileRequestToken !== requestToken) {
      this.profileRequestToken = requestToken;
      this.profileRequest = this.profileService.getProfile().pipe(
        map(response => {
          const envelope = response as UserProfileDto & { data?: UserProfileDto };
          return envelope.data ?? envelope;
        }),
        tap(profile => {
          if (this.authService.getToken() === requestToken) this.applyProfile(profile);
        }),
        finalize(() => {
          if (this.profileRequestToken === requestToken) {
            this.profileRequest = undefined;
            this.profileRequestToken = null;
          }
        }),
        shareReplay(1)
      );
    }

    return this.profileRequest;
  }

  private applyProfile(profile: UserProfileDto): void {
    if (typeof profile.darkMode === 'boolean') {
      this.themeService.setTheme(profile.darkMode ? 'dark' : 'light', false);
    }

    if (typeof profile.language === 'string' && profile.language.trim()) {
      this.translationService.setLanguage(profile.language, false);
    }

    this.authService.saveCurrentUser({
      ...this.authService.currentUser(),
      ...profile
    });
  }
}

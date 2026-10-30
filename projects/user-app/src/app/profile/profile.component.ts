import {
  Component,
  signal,
  inject,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  effect
} from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ProfileService, APP_ICONS } from '@granary/shared';
import { AuthService } from '@granary/shared';
import { ThemeService } from '../core/services/theme.service';
import { UserProfileDto, HouseholdMember } from '@granary/shared';
import { HouseholdInviteSheetComponent } from './components/household-invite-sheet/household-invite-sheet.component';
import { HelpFaqSheetComponent } from './components/help-faq-sheet/help-faq-sheet.component';
import { TranslationService } from '@granary/shared';
import { TranslatePipe } from '@granary/shared';
import { MediaUrlPipe } from '@granary/shared';
import { PwaInstallService } from '../core/services/pwa-install.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    HouseholdInviteSheetComponent,
    HelpFaqSheetComponent,
    TranslatePipe,
    MediaUrlPipe,
    APP_ICONS,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile.component.html'
})
export class ProfileComponent implements OnInit {
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly profileService = inject(ProfileService);
  private readonly authService = inject(AuthService);
  protected readonly themeService = inject(ThemeService);
  private readonly cdr = inject(ChangeDetectorRef);
  protected readonly translationService = inject(TranslationService);
  protected readonly pwaInstall = inject(PwaInstallService);

  isInstallHelpOpen = signal<boolean>(false);
  isLanguageDropdownOpen = signal<boolean>(false);
  isLoading = signal<boolean>(true);

  // Dane użytkownika
  name = signal<string>('');
  email = signal<string>('');
  avatarUrl = signal<string | null>(null);

  // Stan edycji nazwy użytkownika
  isEditingName = signal<boolean>(false);
  editNameValue = signal<string>('');

  householdMembers = signal<HouseholdMember[]>([]);
  isHouseholdSheetOpen = signal<boolean>(false);
  isHelpSheetOpen = signal<boolean>(false);

  expiryNotifications = signal<boolean>(true);
  dietPreference = signal<string>('Brak');

  readonly fallbackAvatar = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' fill='%23FAF9F5' viewBox='0 0 24 24'><rect width='24' height='24' fill='%23FAF9F5'/><circle cx='12' cy='8' r='4' fill='%23D4D4D4'/><path d='M4 20c0-4 4-6 8-6s8 2 8 6' fill='%23D4D4D4'/></svg>";

  constructor() {
    effect(() => {
      this.translationService.dictionary();
      this.translationService.currentLang();
      this.cdr.markForCheck();
    });
  }

  ngOnInit(): void {
    const cachedUser = this.authService.currentUser();
    if (cachedUser) {
      const initialName = cachedUser.name || cachedUser.userName || (cachedUser.email ? cachedUser.email.split('@')[0] : '');
      this.name.set(initialName);
      this.email.set(cachedUser.email || '');
      this.avatarUrl.set(cachedUser.avatarUrl || null);
      this.isLoading.set(false);
    }

    this.loadUserProfile();
  }

  loadUserProfile(): void {
    this.profileService.getProfile().subscribe({
      next: (res: any) => {
        const data: UserProfileDto = res?.data ?? res;
        if (data) {
          const resolvedName = data.name || data.userName || (data.email ? data.email.split('@')[0] : 'Użytkownik');
          this.name.set(resolvedName);
          this.email.set(data.email || '');

          if (data.avatarUrl) this.avatarUrl.set(data.avatarUrl);
          if (data.dietPreference) this.dietPreference.set(data.dietPreference);
          if (data.expiryNotifications !== undefined) this.expiryNotifications.set(data.expiryNotifications);

          this.authService.saveCurrentUser(data);
        }
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        if (!this.name()) this.name.set('Użytkownik');
        this.isLoading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  // --- OBSŁUGA EDYCJI NAZWY ---
  startEditName(): void {
    this.editNameValue.set(this.name());
    this.isEditingName.set(true);
  }

  cancelEditName(): void {
    this.isEditingName.set(false);
  }

  saveName(): void {
    const newName = this.editNameValue().trim();
    if (!newName || newName === this.name()) {
      this.isEditingName.set(false);
      return;
    }

    const formData = new FormData();
    formData.append('username', newName);

    this.profileService.updateProfile(formData).subscribe({
      next: () => {
        this.name.set(newName);
        const user = this.authService.currentUser();
        if (user) {
          user.name = newName;
          user.userName = newName;
          this.authService.saveCurrentUser(user);
        }
        this.isEditingName.set(false);
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Błąd zapisu nazwy:', err);
        this.isEditingName.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  // --- OBSŁUGA AWATARA ---
  onAvatarFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      // Podgląd natychmiastowy Base64 w UI
      const reader = new FileReader();
      reader.onload = (e) => {
        this.avatarUrl.set(e.target?.result as string);
        this.cdr.markForCheck();
      };
      reader.readAsDataURL(file);

      // Wysyłka prawdziwego pliku do backendu
      const formData = new FormData();
      formData.append('avatar', file);

      this.profileService.updateProfile(formData).subscribe({
        next: (res) => {
          if (res?.avatarUrl) {
            this.avatarUrl.set(res.avatarUrl);
            const user = this.authService.currentUser();
            if (user) {
              user.avatarUrl = res.avatarUrl;
              this.authService.saveCurrentUser(user);
            }
          }
          this.cdr.markForCheck();
        },
        error: (err) => console.error('Błąd aktualizacji awatara:', err)
      });
    }
  }

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.onerror = null;
    img.src = this.fallbackAvatar;
  }

  goBack(): void {
    this.location.back();
  }

  openHouseholdSheet(): void {
    this.isHouseholdSheetOpen.set(true);
  }

  closeHouseholdSheet(): void {
    this.isHouseholdSheetOpen.set(false);
  }

  toggleDarkMode(): void {
    const nextMode = this.themeService.isDark() ? 'light' : 'dark';
    this.themeService.setTheme(nextMode, true);
  }

  toggleExpiryNotifications(): void {
    const previousValue = this.expiryNotifications();
    const nextValue = !previousValue;

    this.expiryNotifications.set(nextValue);

    this.profileService.updateExpiryNotifications(nextValue).subscribe({
      error: (err) => {
        this.expiryNotifications.set(previousValue);
        this.cdr.markForCheck();
        console.error('Błąd zapisu preferencji powiadomień:', err);
      }
    });
  }

  async installApp(): Promise<void> {
    if (this.pwaInstall.canPrompt()) {
      const outcome = await this.pwaInstall.promptInstall();
      if (outcome !== 'unavailable') {
        this.isInstallHelpOpen.set(false);
        this.cdr.markForCheck();
        return;
      }
    }
    // Brak natywnego monitu (np. iOS Safari) - pokazujemy instrukcję ręcznej instalacji.
    this.isInstallHelpOpen.update(v => !v);
  }

  logout(): void {
    if (confirm('Czy na pewno chcesz się wylogować?')) {
      this.profileService.logout().subscribe({
        next: () => this.finalizeLogout(),
        error: () => this.finalizeLogout()
      });
    }
  }

  private finalizeLogout(): void {
    this.authService.logout();
    this.router.navigate(['/auth']);
  }

  toggleLanguageDropdown(event: Event): void {
    event.stopPropagation();
    this.isLanguageDropdownOpen.update(v => !v);
  }

  selectLanguage(code: string): void {
    this.translationService.setLanguage(code, true);
    this.isLanguageDropdownOpen.set(false);
  }
}
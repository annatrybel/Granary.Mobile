import { 
  Component, 
  signal, 
  inject, 
  OnInit, 
  ChangeDetectionStrategy, 
  ChangeDetectorRef 
} from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { ProfileService } from '../../core/services/profile.service';
import { AuthService } from '../../core/services/auth.service';
import { UserProfileDto, HouseholdMember } from './models/profile.models';
import { HouseholdInviteSheetComponent } from './components/household-invite-sheet/household-invite-sheet.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule, 
    RouterLink, 
    LucideAngularModule,
    HouseholdInviteSheetComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  private location = inject(Location);
  private router = inject(Router);
  private profileService = inject(ProfileService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  isLoading = signal<boolean>(true);

  name = signal<string>('');
  email = signal<string>('');
  avatarUrl = signal<string | null>(null);

  householdMembers = signal<HouseholdMember[]>([]);
  isHouseholdSheetOpen = signal<boolean>(false);

  expiryNotifications = signal<boolean>(true);
  dietPreference = signal<string>('Brak');
  darkMode = signal<boolean>(false);
  language = signal<string>('Polski');
  unitSystem = signal<string>('Metryczne');

  readonly fallbackAvatar = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' fill='%23FAF9F5' viewBox='0 0 24 24'><rect width='24' height='24' fill='%23FAF9F5'/><circle cx='12' cy='8' r='4' fill='%23D4D4D4'/><path d='M4 20c0-4 4-6 8-6s8 2 8 6' fill='%23D4D4D4'/></svg>";

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
          const resolvedName = data.name || (data as any).userName || (data.email ? data.email.split('@')[0] : 'Użytkownik');
          this.name.set(resolvedName);
          this.email.set(data.email || '');
          
          if (data.avatarUrl) this.avatarUrl.set(data.avatarUrl);
          if (data.dietPreference) this.dietPreference.set(data.dietPreference);
          if (data.expiryNotifications !== undefined) this.expiryNotifications.set(data.expiryNotifications);
          if (data.darkMode !== undefined) this.darkMode.set(data.darkMode);

          this.authService.saveCurrentUser(data);
        }
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        if (!this.name()) {
          this.name.set('Użytkownik');
        }
        this.isLoading.set(false);
        this.cdr.markForCheck();
      }
    });
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


  toggleExpiryNotifications(): void {
    this.expiryNotifications.update(v => !v);
  }

  toggleDarkMode(): void {
    this.darkMode.update(v => !v);
  }


  onAvatarFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      const reader = new FileReader();
      reader.onload = (e) => {
        this.avatarUrl.set(e.target?.result as string);
        this.cdr.markForCheck();
      };
      reader.readAsDataURL(file);

      const formData = new FormData();
      formData.append('avatar', file);
      this.profileService.updateProfile(formData).subscribe({
        error: (err) => console.error('Błąd aktualizacji awatara:', err)
      });
    }
  }

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.onerror = null; 
    img.src = this.fallbackAvatar;
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
}
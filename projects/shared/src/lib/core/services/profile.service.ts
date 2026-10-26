import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../tokens/api-base-url.token';
import { UserProfileDto, UpdateProfileResponseDto } from '../../profile/profile.models';

export interface ContactMessageDto {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

export interface NotificationDto {
  id: string;
  pantryItemId?: string;
  productName: string;
  daysRemaining: number;
  isRead: boolean;
  createdAtUtc: string;
}

export interface SavePushSubscriptionDto {
  endpoint: string;
  p256dh: string;
  auth: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly baseUrl = `${this.apiBaseUrl}/profile`;

  readonly notifications = signal<NotificationDto[]>([]);

  readonly unreadCount = computed(() =>
    this.notifications().filter(n => !n.isRead).length
  );

  loadNotifications(onlyUnread: boolean = true): void {
    this.getNotifications(onlyUnread).subscribe({
      next: (items) => this.notifications.set(items ?? []),
      error: (err) => console.error('Błąd pobierania powiadomień:', err)
    });
  }

  getNotifications(onlyUnread: boolean = true): Observable<NotificationDto[]> {
    return this.http.get<NotificationDto[]>(`${this.baseUrl}/notifications?onlyUnread=${onlyUnread}`);
  }

  markNotificationAsRead(id: string): Observable<void> {
    // Optymistycznie usuwamy z widoku
    this.notifications.update(list => list.filter(n => n.id !== id));

    return this.http.patch<void>(`${this.baseUrl}/notifications/${id}/read`, {});
  }

  savePushSubscription(dto: SavePushSubscriptionDto): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/push-subscription`, dto);
  }
  updateExpiryNotifications(enabled: boolean): Observable<any> {
    return this.http.patch(`${this.baseUrl}/notifications-settings`, {
      expiryNotifications: enabled
    });
  }

  getProfile(): Observable<UserProfileDto> {
    return this.http.get<UserProfileDto>(`${this.baseUrl}/me`);
  }

  updateProfile(formData: FormData): Observable<UpdateProfileResponseDto> {
    return this.http.put<UpdateProfileResponseDto>(`${this.baseUrl}/update-profile`, formData);
  }

  updateDarkMode(darkMode: boolean): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/dark-mode`, { darkMode });
  }

  updateLanguage(language: string): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/language`, { language });
  }

  inviteHouseholdMember(recipientEmail: string, pantryName: string): Observable<boolean> {
    return this.http.post<boolean>(`${this.baseUrl}/invite-member`, {
      recipientEmail,
      pantryName
    });
  }

  sendContactMessage(dto: ContactMessageDto): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/contact`, dto);
  }

  logout(): Observable<any> {
    return this.http.post(`${this.apiBaseUrl}/authentication/logout`, {});
  }
}
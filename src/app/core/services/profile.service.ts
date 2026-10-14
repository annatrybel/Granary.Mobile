import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserProfileDto, UpdateProfileResponseDto } from '../../features/profile/models/profile.models';

export interface ContactMessageDto {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/profile`; 

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
    return this.http.post<void>(`${environment.apiBaseUrl}/contact`, dto);
  }

  logout(): Observable<any> {
    return this.http.post(`${environment.apiBaseUrl}/authentication/logout`, {});
  }
}
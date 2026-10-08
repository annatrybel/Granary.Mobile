import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserProfileDto } from '../../features/profile/models/profile.models';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/profile`; 

  getProfile(): Observable<UserProfileDto> {
    return this.http.get<UserProfileDto>(`${this.baseUrl}/me`);
  }

  updateProfile(formData: FormData): Observable<any> {
    return this.http.put(`${this.baseUrl}/update-profile`, formData);
  }

  updateDarkMode(darkMode: boolean): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/dark-mode`, { darkMode });
  }

  logout(): Observable<any> {
    // Wylogowanie nadal odwołuje się do modułu autentykacji
    return this.http.post(`${environment.apiBaseUrl}/authentication/logout`, {});
  }
}
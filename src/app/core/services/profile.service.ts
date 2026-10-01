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
  private readonly baseUrl = `${environment.apiBaseUrl}/authentication`;

  getProfile(): Observable<UserProfileDto> {
    return this.http.get<UserProfileDto>(`${this.baseUrl}/me`);
  }

  updateProfile(formData: FormData): Observable<any> {
    return this.http.put(`${this.baseUrl}/update-profile`, formData);
  }

  logout(): Observable<any> {
    return this.http.post(`${this.baseUrl}/logout`, {});
  }
}
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { PagedResult } from '../../../shared/models/common.models';

export interface UserDto {
  userId: string;
  userName: string;
  email: string;
  roleName: string;
  isLocked: boolean;
  invitationCode?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/adminPanel/users`;

  getUsers(page = 1, pageSize = 10, search = '') {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (search) params = params.set('search', search);
    return this.http.get<PagedResult<UserDto>>(this.url, { params });
  }

  lockUser = (id: string) => this.http.post(`${this.url}/lock-user/${id}`, {});
  unlockUser = (id: string) => this.http.post(`${this.url}/unlock-user/${id}`, {});
}
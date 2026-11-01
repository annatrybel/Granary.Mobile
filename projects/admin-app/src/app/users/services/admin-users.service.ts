import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API_BASE_URL, PagedResult } from '@granary/shared';

export interface UserDto {
  userId: string;
  userName: string;
  email: string;
  roleId: string;
  roleName: string;
  isLocked: boolean;
  invitationCode?: string;
}

export interface RoleDto {
  id: string;
  name: string;
}

export interface UserFormValue {
  userName: string;
  email: string;
  roleId: string;
}

@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly url = `${this.apiBaseUrl}/adminPanel/users`;

  getUsers(page = 1, pageSize = 10, search = '') {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (search) params = params.set('search', search);
    return this.http.get<PagedResult<UserDto>>(`${this.url}/get-all-users`, { params });
  }

  getRoles() {
    return this.http.get<RoleDto[]>(`${this.url}/roles`);
  }

  createUser(value: UserFormValue) {
    return this.http.post<UserDto>(`${this.url}/create-user`, value);
  }

  updateUser(userId: string, value: UserFormValue) {
    return this.http.post(`${this.url}/update-user`, { userId, ...value });
  }

  lockUser = (id: string) => this.http.post(`${this.url}/lock-user/${id}`, {});
  unlockUser = (id: string) => this.http.post(`${this.url}/unlock-user/${id}`, {});
}
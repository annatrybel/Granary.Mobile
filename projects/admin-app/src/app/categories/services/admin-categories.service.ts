import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@granary/shared';

export interface AdminCategory {
  id: string;
  name: string;
  imageUrl: string | null;
  displayOrder: number;
}

export interface AdminCategoryUpdate {
  name: string;
  displayOrder: number;
  imageUrl: string | null;
}

@Injectable({ providedIn: 'root' })
export class AdminCategoriesService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly categoriesUrl = `${this.apiBaseUrl}/admin/categories`;

  getCategories(): Observable<AdminCategory[]> {
    return this.http.get<AdminCategory[]>(this.categoriesUrl);
  }

  updateCategory(id: string, value: AdminCategoryUpdate): Observable<AdminCategory> {
    return this.http.put<AdminCategory>(`${this.categoriesUrl}/${id}`, value);
  }

  updateCategoryWithFile(id: string, value: AdminCategoryUpdate, imageFile: File): Observable<AdminCategory> {
    const formData = new FormData();
    formData.append('Name', value.name);
    formData.append('DisplayOrder', String(value.displayOrder));
    formData.append('ImageUrl', value.imageUrl ?? '');
    formData.append('ImageFile', imageFile);
    return this.http.put<AdminCategory>(`${this.categoriesUrl}/${id}`, formData);
  }
}

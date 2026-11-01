import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL, PagedResult } from '@granary/shared';

export interface CatalogProductDto {
  id: string;
  name: string;
  defaultUnit?: string;
  categoryId?: string;
  categoryName?: string;
  defaultShelfLifeDays?: number;
  imageUrl?: string;
  createdByUserId?: string | null;
}

export interface CatalogProductsPage extends PagedResult<CatalogProductDto> {
  customProductsCount: number;
}

export interface CategoryDto {
  id: string;
  name: string;
  iconName?: string;
  displayOrder?: number;
}

export interface ProductFormValue {
  name: string;
  imageUrl: string | null;
  defaultUnit: string | null;
  defaultShelfLifeDays: number;
  categoryId: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminProductsService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  
  private readonly adminCatalogUrl = `${this.apiBaseUrl}/admin/catalog-products`;
  private readonly categoriesUrl = `${this.apiBaseUrl}/catalog-products/categories`;

  getProducts(page: number, pageSize: number, search = '', categoryId?: string): Observable<CatalogProductsPage> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (search) params = params.set('search', search);
    if (categoryId && categoryId !== 'all') params = params.set('categoryId', categoryId);

    return this.http.get<CatalogProductsPage>(this.adminCatalogUrl, { params });
  }

  getCategories(): Observable<CategoryDto[]> {
    return this.http.get<CategoryDto[]>(this.categoriesUrl);
  }

  createProduct(value: ProductFormValue): Observable<CatalogProductDto> {
    return this.http.post<CatalogProductDto>(this.adminCatalogUrl, value);
  }

  updateProduct(id: string, value: ProductFormValue): Observable<CatalogProductDto> {
    return this.http.put<CatalogProductDto>(`${this.adminCatalogUrl}/${id}`, value);
  }

  deleteProduct(id: string): Observable<any> {
    return this.http.delete(`${this.adminCatalogUrl}/${id}`);
  }
}
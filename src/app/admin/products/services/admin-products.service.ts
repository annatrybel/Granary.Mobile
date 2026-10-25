import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface CatalogProductDto {
  id: string;
  name: string;
  barcode?: string;
  packageSize?: string;
  defaultUnit?: string;
  categoryId?: string;
  categoryName?: string;
  defaultLocation?: string;
  defaultShelfLifeDays?: number;
  imageUrl?: string;
  isCustom?: boolean;
  isApproved?: boolean;
  createdByUserName?: string;
}

export interface CategoryDto {
  id: string;
  name: string;
  iconName?: string;
  displayOrder?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminProductsService {
  private readonly http = inject(HttpClient);
  
  private readonly adminCatalogUrl = `${environment.apiBaseUrl}/admin/catalog-products`;
  private readonly categoriesUrl = `${environment.apiBaseUrl}/catalog-products/categories`;

  getAllProducts(query?: string, categoryId?: string): Observable<CatalogProductDto[]> {
    let params = new HttpParams();
    if (query) params = params.set('query', query);
    if (categoryId && categoryId !== 'all') params = params.set('categoryId', categoryId);

    return this.http.get<CatalogProductDto[]>(this.adminCatalogUrl, { params });
  }

  getCategories(): Observable<CategoryDto[]> {
    return this.http.get<CategoryDto[]>(this.categoriesUrl);
  }

  deleteProduct(id: string): Observable<any> {
    return this.http.delete(`${this.adminCatalogUrl}/${id}`);
  }
}
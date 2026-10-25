import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

import {
  RecipeMatchDto,
  RecipeDetailDto,
  VoteRecipeRequest,
  VoteResultDto,
  CreateCustomRecipePayload,
  RecipeQueryParams,
  PagedRecipesResult,
  CatalogProductDto
} from '../../user/recipes/models/recipe.models';

@Injectable({
  providedIn: 'root'
})
export class RecipeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/recipes`;
  private readonly catalogUrl = `${environment.apiBaseUrl}/catalog-products`;

  getRecipes(filters: RecipeQueryParams): Observable<PagedRecipesResult> {
    let params = new HttpParams()
      .set('scope', filters.scope)
      .set('page', filters.page.toString())
      .set('pageSize', filters.pageSize.toString())
      .set('sortBy', filters.sortBy || 'match');

    const optionalFilters: Record<string, string | number | undefined | null> = {
      query: filters.query?.trim(),
      items: filters.items?.trim(),
      maxTime: filters.maxTime,
      mealType: filters.mealType,
      diet: filters.diet
    };

    Object.entries(optionalFilters).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        params = params.set(key, val.toString());
      }
    });

    return this.http.get<any>(this.baseUrl, { params }).pipe(
      map((res: any): PagedRecipesResult => {
        const raw = res?.data ?? res?.result ?? res;
        return {
          items: (raw?.items ?? []) as RecipeMatchDto[],
          totalCount: raw?.totalCount ?? 0,
          page: raw?.page ?? filters.page,
          pageSize: raw?.pageSize ?? filters.pageSize,
          hasMore: raw?.hasMore ?? ((raw?.page ?? filters.page) * (raw?.pageSize ?? filters.pageSize) < (raw?.totalCount ?? 0))
        };
      })
    );
  }

  searchCatalogProducts(query?: string, categoryId?: string): Observable<CatalogProductDto[]> {
    let params = new HttpParams();
    if (query?.trim()) params = params.set('query', query.trim());
    if (categoryId) params = params.set('categoryId', categoryId);

    return this.http.get<any>(this.catalogUrl, { params }).pipe(
      map((res: any): CatalogProductDto[] => {
        const raw = res?.data ?? res?.result ?? res;
        return Array.isArray(raw) ? (raw as CatalogProductDto[]) : [];
      })
    );
  }

  getById(id: string): Observable<RecipeDetailDto> {
    return this.http.get<any>(`${this.baseUrl}/${id}`).pipe(
      map((res: any): RecipeDetailDto => {
        const raw = res?.data ?? res?.result ?? res;
        const ingredients = raw?.ingredients ?? raw?.Ingredients ?? [];

        return {
          id: raw?.id ?? raw?.Id ?? id,
          title: raw?.title ?? raw?.Title ?? '',
          instructions: raw?.instructions ?? raw?.Instructions ?? '',
          calories: raw?.calories ?? raw?.Calories ?? null,
          imageUrl: raw?.imageUrl ?? raw?.ImageUrl,
          prepTimeMinutes: raw?.prepTimeMinutes ?? raw?.PrepTimeMinutes ?? 15,
          servings: raw?.servings ?? raw?.Servings ?? 2,
          isFavorite: raw?.isFavorite ?? false,
          isCustom: raw?.isCustom ?? false,
          likesCount: raw?.likesCount ?? 0,
          dislikesCount: raw?.dislikesCount ?? 0,
          userVote: raw?.userVote ?? null,
          ingredients: ingredients.map((i: any) => ({
            productId: i.productId ?? i.ProductId,
            productName: i.productName ?? i.ProductName ?? 'Składnik',
            quantity: i.quantity ?? i.Quantity ?? 1,
            unit: i.unit ?? i.Unit ?? 'szt.',
            isOptional: !!(i.isOptional ?? i.IsOptional),
            isOwnedInPantry: !!(i.isOwnedInPantry ?? i.IsOwnedInPantry)
          }))
        };
      })
    );
  }

  toggleFavorite(recipeId: string): Observable<boolean> {
    return this.http.post<any>(`${this.baseUrl}/${recipeId}/favorite`, {}).pipe(
      map((res: any): boolean => res?.data ?? res?.result ?? res ?? true)
    );
  }

  voteRecipe(recipeId: string, isLike: boolean): Observable<VoteResultDto> {
    const payload: VoteRecipeRequest = { isLike };
    return this.http.post<any>(`${this.baseUrl}/${recipeId}/vote`, payload).pipe(
      map((res: any): VoteResultDto => res?.data ?? res?.result ?? res)
    );
  }

  createRecipe(payload: CreateCustomRecipePayload): Observable<RecipeDetailDto> {
    return this.http.post<any>(this.baseUrl, payload).pipe(
      map((res: any): RecipeDetailDto => res?.data ?? res?.result ?? res)
    );
  }

  createCatalogProduct(name: string): Observable<CatalogProductDto> {
    return this.http.post<any>(`${environment.apiBaseUrl}/catalog-products/custom`, { name: name.trim() }).pipe(
      map((res: any): CatalogProductDto => res?.data ?? res?.result ?? res)
    );
  }

  deleteRecipe(recipeId: string): Observable<boolean> {
    return this.http.delete<any>(`${this.baseUrl}/${recipeId}`).pipe(
      map(res => res?.data ?? res?.result ?? true)
    );
  }

  updateRecipe(recipeId: string, payload: CreateCustomRecipePayload): Observable<RecipeDetailDto> {
    return this.http.put<any>(`${this.baseUrl}/${recipeId}`, payload).pipe(
      map(res => res?.data ?? res?.result ?? res)
    );
  }

  generateRecipeImage(title: string): Observable<{ success: boolean; imageUrl: string; message?: string }> {
    return this.http.post<{ success: boolean; imageUrl: string; message?: string }>(
      `${environment.apiBaseUrl}/recipes/generate-image`,
      { title }
    );
  }
}
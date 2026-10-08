import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export type { 
  RecipeMatchDto, 
  RecipeDetailDto, 
  VoteRecipeRequest, 
  VoteResultDto,
  CreateCustomRecipePayload,
  RecipeQueryParams,
  PagedRecipesResult,
  CatalogProductDto
} from '../../features/recipes/models/recipe.models';

import { 
  RecipeMatchDto, 
  RecipeDetailDto, 
  VoteRecipeRequest, 
  VoteResultDto,
  CreateCustomRecipePayload,
  RecipeQueryParams,
  PagedRecipesResult,
  CatalogProductDto
} from '../../features/recipes/models/recipe.models';

@Injectable({
  providedIn: 'root'
})
export class RecipeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/recipes`;
  private readonly catalogUrl = `${environment.apiBaseUrl}/catalogproducts`;

  getRecipes(filters: RecipeQueryParams): Observable<PagedRecipesResult> {
    let params = new HttpParams()
      .set('scope', filters.scope)
      .set('page', filters.page.toString())
      .set('pageSize', filters.pageSize.toString())
      .set('sortBy', filters.sortBy || 'match');

    if (filters.query?.trim()) {
      params = params.set('query', filters.query.trim());
    }

    if (filters.items?.trim()) {
      params = params.set('items', filters.items.trim());
    }

    if (filters.maxTime) {
      params = params.set('maxTime', filters.maxTime.toString());
    }

    if (filters.mealType) {
      params = params.set('mealType', filters.mealType);
    }

    if (filters.diet) {
      params = params.set('diet', filters.diet);
    }

    return this.http.get<any>(this.baseUrl, { params }).pipe(
      map((res: any): PagedRecipesResult => {
        const raw = res?.data ?? res?.result ?? res;
        return {
          items: (raw?.items ?? []) as RecipeMatchDto[],
          totalCount: raw?.totalCount ?? 0,
          page: raw?.page ?? filters.page,
          pageSize: raw?.pageSize ?? filters.pageSize,
          hasMore: raw?.hasMore ?? false
        };
      })
    );
  }

  searchCatalogProducts(query?: string, categoryId?: string): Observable<CatalogProductDto[]> {
    let params = new HttpParams();
    if (query?.trim()) {
      params = params.set('query', query.trim());
    }
    if (categoryId) {
      params = params.set('categoryId', categoryId);
    }

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
          description: raw?.description ?? '',
          instructions: raw?.instructions ?? raw?.Instructions ?? '',
          imageUrl: raw?.imageUrl ?? raw?.ImageUrl,
          prepTimeMinutes: raw?.prepTimeMinutes ?? raw?.PrepTimeMinutes ?? 15,
          servings: raw?.servings ?? raw?.Servings ?? 2,
          calories: raw?.calories ?? null,
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
    const payload: Partial<CatalogProductDto> = {
      name: name.trim()
    };

    return this.http.post<any>(`${environment.apiBaseUrl}/catalog-products/custom`, payload).pipe(
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
}
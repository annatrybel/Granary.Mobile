import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, defer, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_BASE_URL, CatalogProductDto } from '@granary/shared';
import { AppDatabase, OfflineRecipe } from '../db/app-database';
import { NetworkService } from './network.service';
import { SyncService } from './sync.service';

import {
  RecipeMatchDto,
  RecipeDetailDto,
  VoteRecipeRequest,
  VoteResultDto,
  CreateCustomRecipePayload,
  RecipeQueryParams,
  PagedRecipesResult
} from '@granary/shared';

const unwrap = (res: any): any => res?.data ?? res?.result ?? res;

/**
 * Odczyty są cache'owane w IndexedDB, a zmiany wykonane bez sieci trafiają do kolejki synchronizacji.
 * Gdy sieć jest dostępna, zmiany idą bezpośrednio na serwer.
 */
@Injectable({
  providedIn: 'root'
})
export class RecipeService {
  private readonly http = inject(HttpClient);
  private readonly db = inject(AppDatabase);
  private readonly network = inject(NetworkService);
  private readonly sync = inject(SyncService);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly baseUrl = `${this.apiBaseUrl}/recipes`;
  private readonly catalogUrl = `${this.apiBaseUrl}/catalog-products`;

  getRecipes(filters: RecipeQueryParams): Observable<PagedRecipesResult> {
    return defer(async () => {
      if (this.network.isOnline()) {
        if (await this.db.pendingCount() > 0) await this.sync.flush();
        try {
          const result = await firstValueFrom(this.fetchRecipes(filters));
          if ((await this.db.pendingCount('recipe')) === 0) {
            await this.cacheRecipes(result.items);
          }
          return result;
        } catch (error) {
          if (!this.isNetworkError(error)) throw error;
        }
      }
      return this.getLocalRecipes(filters);
    });
  }

  /**
   * Zwraca przepisy, które najlepiej wykorzystują produkty z krótkim terminem ważności.
   * Ostatni wynik jest zapisany lokalnie, więc pulpit działa też offline.
   */
  getSuggestedRecipes(expiringCatalogIds: string[], limit = 3): Observable<RecipeMatchDto[]> {
    return defer(async () => {
      if (this.network.isOnline()) {
        try {
          const suggestions = await this.fetchSuggestions(expiringCatalogIds, limit);
          await this.db.transaction('rw', this.db.suggestedRecipes, async () => {
            await this.db.suggestedRecipes.clear();
            await this.db.suggestedRecipes.bulkPut(suggestions.map((recipe, rank) => ({ ...recipe, rank })));
          });
          return suggestions;
        } catch (error) {
          if (!this.isNetworkError(error)) throw error;
        }
      }

      const cached = await this.db.suggestedRecipes.orderBy('rank').toArray();
      if (cached.length > 0) return cached.slice(0, limit);
      return this.rankForSuggestions(await this.db.recipes.toArray()).slice(0, limit);
    });
  }

  searchCatalogProducts(query?: string, categoryId?: string): Observable<CatalogProductDto[]> {
    let params = new HttpParams();
    if (query?.trim()) params = params.set('query', query.trim());
    if (categoryId) params = params.set('categoryId', categoryId);

    return this.http.get<any>(this.catalogUrl, { params }).pipe(
      map((res: any): CatalogProductDto[] => {
        const raw = unwrap(res);
        return Array.isArray(raw) ? (raw as CatalogProductDto[]) : [];
      })
    );
  }

  getById(id: string): Observable<RecipeDetailDto> {
    return defer(async () => {
      const recipeId = await this.db.resolveId(id);

      if (this.network.isOnline()) {
        try {
          const raw = await firstValueFrom(this.http.get<any>(`${this.baseUrl}/${recipeId}`));
          const detail = this.mapDetail(unwrap(raw), recipeId);
          await this.db.recipeDetails.put({ ...detail, updatedAt: Date.now() });
          return detail;
        } catch (error) {
          if (!this.isNetworkError(error)) throw error;
        }
      }

      const local = await this.db.recipeDetails.get(recipeId);
      if (!local) throw new Error(`Przepis ${id} nie jest dostępny offline`);
      return local;
    });
  }

  toggleFavorite(recipeId: string): Observable<boolean> {
    return defer(async () => {
      const id = await this.db.resolveId(recipeId);

      if (this.network.isOnline()) {
        try {
          const res = await firstValueFrom(this.http.post<any>(`${this.baseUrl}/${id}/favorite`, {}));
          const isFavorite = !!(unwrap(res) ?? true);
          await this.setLocalFavorite(id, isFavorite);
          return isFavorite;
        } catch (error) {
          if (!this.isNetworkError(error)) throw error;
        }
      }

      const current = (await this.db.recipes.get(id))?.isFavorite ?? (await this.db.recipeDetails.get(id))?.isFavorite ?? false;
      await this.setLocalFavorite(id, !current);
      await this.db.enqueue({ action: 'TOGGLE_FAVORITE', entity: 'recipe', entityId: id, payload: {} });
      return !current;
    });
  }

  voteRecipe(recipeId: string, isLike: boolean): Observable<VoteResultDto> {
    return defer(async () => {
      const id = await this.db.resolveId(recipeId);
      const payload: VoteRecipeRequest = { isLike };

      if (this.network.isOnline()) {
        try {
          const res = await firstValueFrom(this.http.post<any>(`${this.baseUrl}/${id}/vote`, payload));
          const result: VoteResultDto = unwrap(res);
          await this.applyVoteResult(id, result);
          return result;
        } catch (error) {
          if (!this.isNetworkError(error)) throw error;
        }
      }

      const result = await this.calculateLocalVote(id, isLike);
      await this.applyVoteResult(id, result);
      await this.db.enqueue({ action: 'VOTE', entity: 'recipe', entityId: id, payload });
      return result;
    });
  }

  createRecipe(payload: CreateCustomRecipePayload): Observable<RecipeDetailDto> {
    return defer(async () => {
      if (this.network.isOnline()) {
        try {
          const res = await firstValueFrom(this.http.post<any>(this.baseUrl, payload));
          const created: RecipeDetailDto = unwrap(res);
          await this.cacheDetail(created);
          return created;
        } catch (error) {
          if (!this.isNetworkError(error)) throw error;
        }
      }

      const detail = this.buildLocalDetail(this.db.newId(), payload);
      await this.cacheDetail(detail, false);
      await this.db.enqueue({ action: 'CREATE', entity: 'recipe', entityId: detail.id, payload });
      return detail;
    });
  }

  createCatalogProduct(name: string): Observable<CatalogProductDto> {
    return this.http.post<any>(`${this.apiBaseUrl}/catalog-products/custom`, { name: name.trim() }).pipe(
      map((res: any): CatalogProductDto => unwrap(res))
    );
  }

  deleteRecipe(recipeId: string): Observable<boolean> {
    return defer(async () => {
      const id = await this.db.resolveId(recipeId);

      if (this.network.isOnline()) {
        try {
          await firstValueFrom(this.http.delete<any>(`${this.baseUrl}/${id}`));
          await this.removeLocalRecipe(id);
          return true;
        } catch (error) {
          if (!this.isNetworkError(error)) throw error;
        }
      }

      await this.removeLocalRecipe(id);
      await this.db.enqueue({ action: 'DELETE', entity: 'recipe', entityId: id, payload: { id } });
      return true;
    });
  }

  updateRecipe(recipeId: string, payload: CreateCustomRecipePayload): Observable<RecipeDetailDto> {
    return defer(async () => {
      const id = await this.db.resolveId(recipeId);

      if (this.network.isOnline()) {
        try {
          const res = await firstValueFrom(this.http.put<any>(`${this.baseUrl}/${id}`, payload));
          const updated: RecipeDetailDto = unwrap(res);
          await this.cacheDetail(updated);
          return updated;
        } catch (error) {
          if (!this.isNetworkError(error)) throw error;
        }
      }

      const previous = await this.db.recipeDetails.get(id);
      const detail = {
        ...this.buildLocalDetail(id, payload),
        isFavorite: previous?.isFavorite ?? false,
        likesCount: previous?.likesCount ?? 0,
        dislikesCount: previous?.dislikesCount ?? 0,
        userVote: previous?.userVote ?? null
      };
      await this.cacheDetail(detail, false);
      await this.db.enqueue({ action: 'UPDATE', entity: 'recipe', entityId: id, payload });
      return detail;
    });
  }

  generateRecipeImage(title: string): Observable<{ success: boolean; imageUrl: string; message?: string }> {
    return this.http.post<{ success: boolean; imageUrl: string; message?: string }>(
      `${this.apiBaseUrl}/recipes/generate-image`,
      { title }
    );
  }

  private fetchRecipes(filters: RecipeQueryParams): Observable<PagedRecipesResult> {
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
        const raw = unwrap(res);
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

  private async fetchSuggestions(expiringCatalogIds: string[], limit: number): Promise<RecipeMatchDto[]> {
    const pageSize = 30;
    const byId = new Map<string, RecipeMatchDto>();

    if (expiringCatalogIds.length > 0) {
      const [fromExpiring, general] = await Promise.all([
        firstValueFrom(this.fetchRecipes({
          scope: 'all',
          sortBy: 'match',
          page: 1,
          pageSize,
          items: expiringCatalogIds.join(',')
        })),
        firstValueFrom(this.fetchRecipes({ scope: 'all', sortBy: 'match', page: 1, pageSize }))
      ]);
      fromExpiring.items.forEach(recipe => byId.set(recipe.recipeId, recipe));
      general.items.forEach(recipe => {
        if (!byId.has(recipe.recipeId)) byId.set(recipe.recipeId, recipe);
      });
    } else {
      const general = await firstValueFrom(
        this.fetchRecipes({ scope: 'all', sortBy: 'match', page: 1, pageSize })
      );
      general.items.forEach(recipe => byId.set(recipe.recipeId, recipe));
    }

    return this.rankForSuggestions([...byId.values()]).slice(0, limit);
  }

  private rankForSuggestions<T extends RecipeMatchDto>(recipes: T[]): T[] {
    return [...recipes].sort((a, b) =>
      (b.expiringIngredientsSaved ?? 0) - (a.expiringIngredientsSaved ?? 0) ||
      (b.matchPercentage ?? 0) - (a.matchPercentage ?? 0)
    );
  }

  private async getLocalRecipes(filters: RecipeQueryParams): Promise<PagedRecipesResult> {
    const query = filters.query?.trim().toLowerCase();
    let recipes: RecipeMatchDto[] = await this.db.recipes.toArray();

    recipes = recipes.filter(recipe =>
      (filters.scope !== 'favorites' || recipe.isFavorite) &&
      (filters.scope !== 'custom' || recipe.isCustom) &&
      (!query || recipe.title.toLowerCase().includes(query)) &&
      (!filters.maxTime || recipe.prepTimeMinutes <= filters.maxTime)
    );

    switch (filters.sortBy) {
      case 'time':
        recipes.sort((a, b) => a.prepTimeMinutes - b.prepTimeMinutes);
        break;
      case 'calories':
        recipes.sort((a, b) => (a.calories ?? Infinity) - (b.calories ?? Infinity));
        break;
      default:
        recipes.sort((a, b) => b.matchPercentage - a.matchPercentage);
    }

    const start = (filters.page - 1) * filters.pageSize;
    return {
      items: recipes.slice(start, start + filters.pageSize),
      totalCount: recipes.length,
      page: filters.page,
      pageSize: filters.pageSize,
      hasMore: start + filters.pageSize < recipes.length
    };
  }

  private async cacheRecipes(recipes: RecipeMatchDto[]): Promise<void> {
    const now = Date.now();
    await this.db.recipes.bulkPut(recipes.map(recipe => ({ ...recipe, isSynced: true, updatedAt: now })));
  }

  private async cacheDetail(detail: RecipeDetailDto, isSynced = true): Promise<void> {
    const existing = await this.db.recipes.get(detail.id);
    const summary: OfflineRecipe = {
      recipeId: detail.id,
      title: detail.title,
      imageUrl: detail.imageUrl,
      prepTimeMinutes: detail.prepTimeMinutes,
      servings: detail.servings,
      calories: detail.calories,
      matchPercentage: existing?.matchPercentage ?? 0,
      ownedIngredientsCount: existing?.ownedIngredientsCount ?? 0,
      totalIngredientsCount: detail.ingredients?.length ?? 0,
      expiringIngredientsSaved: existing?.expiringIngredientsSaved ?? 0,
      canBeCookedNow: existing?.canBeCookedNow ?? false,
      isFavorite: detail.isFavorite,
      isCustom: detail.isCustom ?? true,
      missingIngredients: existing?.missingIngredients ?? [],
      isSynced,
      updatedAt: Date.now()
    };

    await this.db.transaction('rw', this.db.recipes, this.db.recipeDetails, async () => {
      await this.db.recipes.put(summary);
      await this.db.recipeDetails.put({ ...detail, updatedAt: Date.now() });
    });
  }

  private async removeLocalRecipe(id: string): Promise<void> {
    await this.db.transaction('rw', this.db.recipes, this.db.recipeDetails, this.db.suggestedRecipes, async () => {
      await this.db.recipes.delete(id);
      await this.db.recipeDetails.delete(id);
      await this.db.suggestedRecipes.delete(id);
    });
  }

  private async setLocalFavorite(id: string, isFavorite: boolean): Promise<void> {
    await this.db.recipes.update(id, { isFavorite });
    await this.db.recipeDetails.update(id, { isFavorite });
  }

  private async calculateLocalVote(id: string, isLike: boolean): Promise<VoteResultDto> {
    const detail = await this.db.recipeDetails.get(id);
    let likes = detail?.likesCount ?? 0;
    let dislikes = detail?.dislikesCount ?? 0;
    const previous = detail?.userVote ?? null;

    if (previous === true) likes--;
    if (previous === false) dislikes--;

    const userVote = previous === isLike ? null : isLike;
    if (userVote === true) likes++;
    if (userVote === false) dislikes++;

    return { likesCount: Math.max(0, likes), dislikesCount: Math.max(0, dislikes), userVote };
  }

  private async applyVoteResult(id: string, result: VoteResultDto): Promise<void> {
    await this.db.recipeDetails.update(id, {
      likesCount: result.likesCount,
      dislikesCount: result.dislikesCount,
      userVote: result.userVote
    });
  }

  private buildLocalDetail(id: string, payload: CreateCustomRecipePayload): RecipeDetailDto {
    return {
      id,
      title: payload.title,
      instructions: payload.steps.map((step, index) => `${index + 1}. ${step}`).join('\n'),
      imageUrl: payload.imageUrl,
      prepTimeMinutes: payload.prepTimeMinutes,
      servings: payload.servings,
      calories: payload.calories ?? null,
      isFavorite: false,
      isCustom: true,
      likesCount: 0,
      dislikesCount: 0,
      userVote: null,
      ingredients: payload.ingredients.map(ingredient => {
        const [, quantity = '1', unit = ''] = /^\s*([\d.,]+)\s*(.*)$/.exec(ingredient.quantity) ?? [];
        return {
          productId: ingredient.productId ?? '',
          productName: ingredient.name,
          quantity: Number(quantity.replace(',', '.')) || 1,
          unit: unit || 'szt.',
          isOptional: false,
          isOwnedInPantry: false
        };
      })
    };
  }

  private mapDetail(raw: any, id: string): RecipeDetailDto {
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
  }

  private isNetworkError(error: unknown): boolean {
    return error instanceof HttpErrorResponse && error.status === 0;
  }
}

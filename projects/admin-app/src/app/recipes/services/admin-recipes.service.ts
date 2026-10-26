import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API_BASE_URL, PagedResult } from '@granary/shared';

export interface AdminRecipeItem {
  id: string;
  code: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  category: string;
  mainIngredients: string[];
  extraIngredientsCount: number;
  prepTimeMinutes: number;
  servings: number;
  difficulty: string;
  rating?: number;
  reviewsCount: number;
  cookedCount: number;
  isOfficial: boolean;
  isNew: boolean;
}

export interface AdminRecipeKpis {
  totalRecipes: number;
  officialRecipes: number;
  communityRecipes: number;
  averageRating: number;
  totalReviews: number;
  pendingVerification: number;
  totalCookedMeals: number;
}

@Injectable({ providedIn: 'root' })
export class AdminRecipesService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly url = `${this.apiBaseUrl}/admin/recipes`;

  getKpis = () => this.http.get<AdminRecipeKpis>(`${this.url}/kpis`);

  getRecipes(params: { search?: string; mealType?: string; diet?: string; status?: string; pageNumber: number; pageSize: number }) {
    let p = new HttpParams().set('pageNumber', params.pageNumber).set('pageSize', params.pageSize);
    if (params.search) p = p.set('search', params.search);
    if (params.mealType && params.mealType !== 'all') p = p.set('mealType', params.mealType);
    if (params.diet && params.diet !== 'all') p = p.set('diet', params.diet);
    if (params.status && params.status !== 'all') p = p.set('status', params.status);
    return this.http.get<PagedResult<AdminRecipeItem>>(this.url, { params: p });
  }

  toggleApproval = (id: string) => this.http.post<boolean>(`${this.url}/${id}/toggle-approval`, {});
  deleteRecipe = (id: string) => this.http.delete<boolean>(`${this.url}/${id}`);
}
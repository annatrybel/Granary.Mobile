import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API_BASE_URL, PagedResult } from '@granary/shared';
import type { DietaryPreference } from '@granary/shared';

export interface AdminRecipeItem {
  id: string;
  code: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
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

export interface AdminRecipeIngredient {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  isOptional: boolean;
}

export interface AdminRecipeEdit {
  id: string;
  title: string;
  imageUrl: string | null;
  servings: number;
  prepTimeMinutes: number;
  calories: number | null;
  steps: string[];
  ingredients: AdminRecipeIngredient[];
}

export type AdminRecipeEditPayload = Omit<AdminRecipeEdit, 'id'>;

@Injectable({ providedIn: 'root' })
export class AdminRecipesService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly url = `${this.apiBaseUrl}/admin/recipes`;

  getKpis = () => this.http.get<AdminRecipeKpis>(`${this.url}/kpis`);

  getRecipeForEdit = (id: string) => this.http.get<AdminRecipeEdit>(`${this.url}/${id}`);
  updateRecipe = (id: string, payload: AdminRecipeEditPayload) => this.http.put<AdminRecipeEdit>(`${this.url}/${id}`, payload);
  createRecipe = (payload: AdminRecipeEditPayload) => this.http.post<AdminRecipeEdit>(this.url, payload);

  getRecipes(params: { search?: string; diet?: DietaryPreference | null; status?: string; pageNumber: number; pageSize: number }) {
    let p = new HttpParams().set('pageNumber', params.pageNumber).set('pageSize', params.pageSize);
    if (params.search) p = p.set('search', params.search);
    if (params.diet != null) p = p.set('diet', params.diet);
    if (params.status && params.status !== 'all') p = p.set('status', params.status);
    return this.http.get<PagedResult<AdminRecipeItem>>(this.url, { params: p });
  }

  toggleApproval = (id: string) => this.http.post<boolean>(`${this.url}/${id}/toggle-approval`, {});
  deleteRecipe = (id: string) => this.http.delete<boolean>(`${this.url}/${id}`);
}
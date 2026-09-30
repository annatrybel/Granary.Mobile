import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  RecipeMatchDto, 
  RecipeDetailDto, 
  VoteRecipeRequest, 
  VoteResultDto 
} from '../../features/recipes/models/recipe.models';

@Injectable({
  providedIn: 'root'
})
export class RecipeService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/recipes`;

  getSuggestions(items?: string[]): Observable<RecipeMatchDto[]> {
    let params = new HttpParams();
    if (items && items.length > 0) {
      params = params.set('items', items.join(','));
    }
    return this.http.get<RecipeMatchDto[]>(`${this.baseUrl}/suggestions`, { params });
  }

  getFavorites(): Observable<RecipeMatchDto[]> {
    return this.http.get<RecipeMatchDto[]>(`${this.baseUrl}/favorites`);
  }

  getById(id: string): Observable<RecipeDetailDto> {
    return this.http.get<RecipeDetailDto>(`${this.baseUrl}/${id}`);
  }

  toggleFavorite(recipeId: string): Observable<boolean> {
    return this.http.post<boolean>(`${this.baseUrl}/${recipeId}/favorite`, {});
  }

  voteRecipe(recipeId: string, isLike: boolean): Observable<VoteResultDto> {
    return this.http.post<VoteResultDto>(`${this.baseUrl}/${recipeId}/vote`, { isLike } as VoteRecipeRequest);
  }
}
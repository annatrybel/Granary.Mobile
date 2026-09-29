import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RecipeMatchDto, RecipeDetailDto } from '../../features/recipes/models/recipe.models';


@Injectable({
  providedIn: 'root'
})
export class RecipeService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/recipes`;


  getSuggestions(itemIds?: string[]): Observable<RecipeMatchDto[]> {
    let params = new HttpParams();
    if (itemIds && itemIds.length > 0) {
      params = params.set('items', itemIds.join(','));
    }
    return this.http.get<RecipeMatchDto[]>(`${this.apiUrl}/suggestions`, { params });
  }


  getById(id: string): Observable<RecipeDetailDto> {
    return this.http.get<RecipeDetailDto>(`${this.apiUrl}/${id}`);
  }
}

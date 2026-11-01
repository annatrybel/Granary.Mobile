import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '@granary/shared';

interface GenerateImageResponse {
  success: boolean;
  imageUrl?: string;
  message?: string;
}

export type AdminImageKind = 'product' | 'recipe';

@Injectable({ providedIn: 'root' })
export class AdminImageService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  generate(kind: AdminImageKind, name: string): Observable<string> {
    const request$ = kind === 'product'
      ? this.http.post<GenerateImageResponse>(`${this.apiBaseUrl}/pantry/items/generate-product-image`, { name })
      : this.http.post<GenerateImageResponse>(`${this.apiBaseUrl}/recipes/generate-image`, { title: name });

    return request$.pipe(
      map(res => {
        if (!res.success || !res.imageUrl) {
          throw new Error(res.message || 'Nie udało się wygenerować obrazu.');
        }
        return res.imageUrl;
      })
    );
  }
}

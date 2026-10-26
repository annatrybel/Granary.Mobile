import { Injectable, inject, signal, effect, untracked } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AppDatabase, ProductItem } from '../db/app-database';
import { NetworkService } from './network.service';
import { API_BASE_URL, CategoryDto, TranslationService } from '@granary/shared';

export interface ScannedProductDto {
  name: string;
  categoryName: string;
  defaultUnit: string;
  estimatedExpiryDays: number;
  suggestedLocation: string;
  imageUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PantryService {
  private db = inject(AppDatabase);
  private network = inject(NetworkService);
  private http = inject(HttpClient);
  private translationService = inject(TranslationService);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  private readonly apiUrl = `${this.apiBaseUrl}/pantry/items`;
  readonly products = signal<ProductItem[]>([]);
  readonly categories = signal<CategoryDto[]>([]);


  constructor() {
    this.loadInitialData();

    let isFirst = true;
    effect(() => {
      const currentLang = this.translationService.currentLang();
      untracked(() => {
        if (isFirst) {
          isFirst = false;
          return;
        }
        if (this.network.isOnline()) {
          this.loadInitialData();
          this.loadCategories();
        }
      });
    });
  }

  async loadInitialData(): Promise<void> {
    const localItems = await this.db.products.toArray();
    this.products.set(localItems);

    if (this.network.isOnline()) {
      this.http.get<any[]>(this.apiUrl).subscribe({
        next: async (serverItems) => {
          if (Array.isArray(serverItems)) {
            const mapped: ProductItem[] = serverItems.map(item => {
              const locStr = (item.storageLocation || '').toLowerCase();
              let polishLoc = 'Lodówka';
              let cat = 'lodowka';

              if (locStr.includes('freezer') || locStr.includes('zamraż')) {
                polishLoc = 'Zamrażarka';
                cat = 'zamrazarka';
              } else if (locStr.includes('pantry') || locStr.includes('spiż')) {
                polishLoc = 'Spiżarnia';
                cat = 'spizarnia';
              }

              return {
                id: item.id,
                catalogProductId: item.productId,
                name: item.productName || item.name || 'Produkt',
                category: cat,
                categoryName: item.categoryName || 'Inne',
                locationName: polishLoc,
                storageLocation: item.storageLocation,
                imageUrl: item.imageUrl,
                quantity: item.quantity || 1,
                unit: item.unit || 'szt.',
                expiryDays: item.expirationDate
                  ? Math.max(0, Math.ceil((new Date(item.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                  : 7,
                isSynced: true,
                updatedAt: Date.now()
              };
            });

            await this.db.products.clear();
            await this.db.products.bulkPut(mapped);
            this.products.set(mapped);
          }
        },
        error: (err) => console.error('Błąd pobierania ze spiżarni:', err)
      });
    }
  }

  async addProduct(product: Omit<ProductItem, 'id' | 'isSynced' | 'updatedAt'>): Promise<void> {
    const isOnline = this.network.isOnline();
    const newProduct: ProductItem = {
      ...product,
      id: crypto.randomUUID(),
      isSynced: isOnline,
      updatedAt: Date.now()
    };

    await this.db.products.add(newProduct);
    this.products.update(items => [newProduct, ...items]);

    const expiryFormatted = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const locationEnum = newProduct.locationName === 'Zamrażarka'
      ? 'Freezer'
      : newProduct.locationName === 'Spiżarnia'
        ? 'Pantry'
        : 'Fridge';

    const backendDto: any = {
      location: locationEnum,
      quantity: newProduct.quantity || 1,
      unit: newProduct.unit || 'szt.',
      expirationDate: expiryFormatted,
      customImageUrl: newProduct.imageUrl, 
      imageUrl: newProduct.imageUrl
    };

    if (newProduct.catalogProductId) {
      backendDto.productId = newProduct.catalogProductId;
    } else {
      backendDto.customProductName = newProduct.name;
    }

    if (!isOnline) {
      await this.db.syncQueue.add({
        action: 'CREATE',
        entity: 'product',
        payload: backendDto,
        createdAt: Date.now()
      });
    } else {
      this.http.post(this.apiUrl, backendDto).subscribe({
        next: () => console.log('Zapisano pomyślnie ze zdjęciem w bazie PostgreSQL!'),
        error: async (err) => {
          console.error('Błąd wysyłki, dodano do syncQueue:', err);
          await this.db.syncQueue.add({
            action: 'CREATE',
            entity: 'product',
            payload: backendDto,
            createdAt: Date.now()
          });
        }
      });
    }
  }

  async updateProduct(
    id: string,
    updates: {
      locationName: string;
      quantity: number;
      unit: string;
      expirationDate: string;
      customImageUrl?: string;
      categoryId?: string;
      categoryName?: string;
    }
  ): Promise<void> {
    const locEnum = updates.locationName === 'Zamrażarka'
      ? 'Freezer'
      : updates.locationName === 'Spiżarnia'
        ? 'Pantry'
        : 'Fridge';

    const expiryDays = Math.max(0, Math.ceil((new Date(updates.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

    const localUpdates: Partial<ProductItem> = {
      locationName: updates.locationName,
      storageLocation: locEnum,
      category: updates.locationName.toLowerCase(),
      quantity: updates.quantity,
      unit: updates.unit,
      expirationDate: updates.expirationDate,
      expiryDays: expiryDays,
      updatedAt: Date.now()
    };

    if (updates.customImageUrl !== undefined) {
      localUpdates.imageUrl = updates.customImageUrl;
    }
    if (updates.categoryName) {
      localUpdates.categoryName = updates.categoryName;
    }

    await this.db.products.update(id, localUpdates);

    this.products.update(items =>
      items.map(p => p.id === id ? { ...p, ...localUpdates } : p)
    );

    if (this.network.isOnline()) {
      const backendDto: any = {
        location: locEnum,
        quantity: updates.quantity,
        unit: updates.unit,
        expirationDate: updates.expirationDate,
        customImageUrl: updates.customImageUrl,
        customCategoryId: updates.categoryId
      };

      this.http.put(`${this.apiUrl}/${id}`, backendDto).subscribe({
        next: (res: any) => {
          const serverItem = res?.data ?? res;
          const newImageUrl = serverItem?.imageUrl;

          if (newImageUrl) {
            this.db.products.update(id, { imageUrl: newImageUrl });
            this.products.update(items =>
              items.map(p => p.id === id ? { ...p, imageUrl: newImageUrl } : p)
            );
          }
        },
        error: (err) => console.error('Błąd aktualizacji na backendzie:', err)
      });
    }
  }
  async deleteProduct(id: string): Promise<void> {
    await this.db.products.delete(id);
    this.products.update(items => items.filter(p => p.id !== id));

    if (this.network.isOnline()) {
      this.http.delete(`${this.apiUrl}/${id}`).subscribe({
        next: () => console.log('Usunięto z bazy PostgreSQL!'),
        error: (err) => console.error('Błąd usuwania z backendu:', err)
      });
    } else {
      await this.db.syncQueue.add({
        action: 'DELETE',
        entity: 'product',
        payload: { id },
        createdAt: Date.now()
      });
    }
  }

  getExpiringItems(days: number, limit: number): Observable<any[]> {
    const params = new HttpParams()
      .set('days', days.toString())
      .set('limit', limit.toString());

    return this.http.get<{ data?: any[]; result?: any[] } | any[]>(
      `${this.apiBaseUrl}/pantry/items/expiring`,
      { params }
    ).pipe(
      map((res: any) => (Array.isArray(res) ? res : res?.data ?? res?.result ?? []))
    );
  }

  loadCategories(): void {
    this.http.get<any>(`${this.apiBaseUrl}/catalog-products/categories`).pipe(
      map((res: any): CategoryDto[] => {
        const raw = res?.data ?? res?.result ?? res;
        return Array.isArray(raw) ? raw : [];
      })
    ).subscribe({
      next: (cats) => this.categories.set(cats),
      error: (err) => console.error('Błąd pobierania kategorii z katalogu:', err)
    });
  }

  generateProductImage(name: string): Observable<{ success: boolean; imageUrl: string; message?: string }> {
    return this.http.post<{ success: boolean; imageUrl: string; message?: string }>(
      `${this.apiBaseUrl}/pantry/items/generate-product-image`,
      { name }
    );
  }

  recognizeProductFromImage(file: File): Observable<ScannedProductDto> {
    const formData = new FormData();
    formData.append('image', file);

    return this.http.post<any>(`${this.apiBaseUrl}/catalog-products/recognize-image`, formData).pipe(
      map(res => res?.data ?? res)
    );
  }
}
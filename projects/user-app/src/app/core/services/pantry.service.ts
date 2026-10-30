import { Injectable, inject, signal, effect, untracked } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AppDatabase, ProductItem } from '../db/app-database';
import { NetworkService } from './network.service';
import { SyncService } from './sync.service';
import { API_BASE_URL, CategoryDto, TranslationService } from '@granary/shared';

export interface ScannedProductDto {
  name: string;
  categoryName: string;
  defaultUnit: string;
  estimatedExpiryDays: number;
  suggestedLocation: string;
  imageUrl?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable({
  providedIn: 'root'
})
export class PantryService {
  private db = inject(AppDatabase);
  private network = inject(NetworkService);
  private sync = inject(SyncService);
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
      this.translationService.currentLang();
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

    let isFirstSync = true;
    effect(() => {
      this.sync.syncVersion();
      untracked(() => {
        if (isFirstSync) {
          isFirstSync = false;
          return;
        }
        void this.reloadFromDb();
      });
    });
  }

  async loadInitialData(): Promise<void> {
    await this.reloadFromDb();

    if (!this.network.isOnline()) return;

    // Zmiany użytkownika muszą trafić na serwer zanim nadpiszemy je stanem z serwera.
    await this.sync.flush();
    if (await this.db.pendingCount('product') > 0) return;

    this.http.get<any[]>(this.apiUrl).subscribe({
      next: async (serverItems) => {
        if (!Array.isArray(serverItems)) return;
        if (await this.db.pendingCount('product') > 0) return;

        const mapped = serverItems.map(item => this.mapServerItem(item));
        await this.db.transaction('rw', this.db.products, async () => {
          await this.db.products.clear();
          await this.db.products.bulkPut(mapped);
        });
        this.products.set(mapped.map(p => this.withFreshExpiry(p)));
      },
      error: (err) => console.error('Błąd pobierania ze spiżarni:', err)
    });
  }

  async addProduct(product: Omit<ProductItem, 'id' | 'isSynced' | 'updatedAt'>): Promise<void> {
    const expiryDays = product.expiryDays ?? 7;
    const expirationDate = product.expirationDate ?? this.dateAfterDays(expiryDays);

    const newProduct: ProductItem = {
      ...product,
      id: this.db.newId(),
      expiryDays,
      expirationDate,
      isSynced: false,
      updatedAt: Date.now()
    };

    await this.db.products.add(newProduct);
    this.products.update(items => [newProduct, ...items]);

    const backendDto: Record<string, unknown> = {
      location: this.toLocationEnum(newProduct.locationName),
      quantity: newProduct.quantity || 1,
      unit: newProduct.unit || 'szt.',
      expirationDate,
      customImageUrl: newProduct.imageUrl,
      imageUrl: newProduct.imageUrl
    };

    if (newProduct.catalogProductId) {
      backendDto['productId'] = newProduct.catalogProductId;
    } else {
      backendDto['customProductName'] = newProduct.name;
    }

    await this.db.enqueue({ action: 'CREATE', entity: 'product', entityId: newProduct.id, payload: backendDto });
    void this.sync.flush();
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
    const localId = await this.db.resolveId(id);
    const locEnum = this.toLocationEnum(updates.locationName);

    const localUpdates: Partial<ProductItem> = {
      locationName: updates.locationName,
      storageLocation: locEnum,
      category: updates.locationName.toLowerCase(),
      quantity: updates.quantity,
      unit: updates.unit,
      expirationDate: updates.expirationDate,
      expiryDays: this.daysUntil(updates.expirationDate),
      isSynced: false,
      updatedAt: Date.now()
    };

    if (updates.customImageUrl !== undefined) {
      localUpdates.imageUrl = updates.customImageUrl;
    }
    if (updates.categoryName) {
      localUpdates.categoryName = updates.categoryName;
    }

    await this.db.products.update(localId, localUpdates);
    this.products.update(items =>
      items.map(p => (p.id === localId ? { ...p, ...localUpdates } : p))
    );

    await this.db.enqueue({
      action: 'UPDATE',
      entity: 'product',
      entityId: localId,
      payload: {
        location: locEnum,
        quantity: updates.quantity,
        unit: updates.unit,
        expirationDate: updates.expirationDate,
        customImageUrl: updates.customImageUrl,
        customCategoryId: updates.categoryId
      }
    });
    void this.sync.flush();
  }

  async deleteProduct(id: string): Promise<void> {
    const localId = await this.db.resolveId(id);

    await this.db.products.delete(localId);
    this.products.update(items => items.filter(p => p.id !== localId));

    await this.db.enqueue({ action: 'DELETE', entity: 'product', entityId: localId, payload: { id: localId } });
    void this.sync.flush();
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

  private async reloadFromDb(): Promise<void> {
    const localItems = await this.db.products.toArray();
    this.products.set(localItems.map(p => this.withFreshExpiry(p)));
  }

  private mapServerItem(item: any): ProductItem {
    const catalogProductId = item.catalogProductId ?? item.productId ?? null;
    const locStr = (item.storageLocation || '').toString().toLowerCase();
    let polishLoc = 'Lodówka';
    let cat = 'lodowka';

    if (locStr.includes('freezer') || locStr.includes('zamraż')) {
      polishLoc = 'Zamrażarka';
      cat = 'zamrazarka';
    } else if (locStr.includes('pantry') || locStr.includes('spiż')) {
      polishLoc = 'Spiżarnia';
      cat = 'spizarnia';
    }

    const expirationDate: string | undefined = item.expirationDate
      ? String(item.expirationDate).slice(0, 10)
      : undefined;

    return {
      id: item.id,
      catalogProductId,
      isCustom: typeof item.isCustom === 'boolean'
        ? item.isCustom
        : Boolean(item.customProductName) || !catalogProductId,
      name: item.productName || item.name || 'Produkt',
      category: cat,
      categoryName: item.categoryName || 'Inne',
      categoryImageUrl: item.categoryImageUrl ?? null,
      locationName: polishLoc,
      storageLocation: item.storageLocation,
      imageUrl: item.imageUrl,
      quantity: item.quantity || 1,
      unit: item.unit || 'szt.',
      expirationDate,
      expiryDays: expirationDate ? this.daysUntil(expirationDate) : 7,
      isSynced: true,
      updatedAt: Date.now()
    };
  }

  /** Liczba dni do końca ważności liczona na bieżąco, żeby dane offline się nie starzały. */
  private withFreshExpiry(product: ProductItem): ProductItem {
    return product.expirationDate
      ? { ...product, expiryDays: this.daysUntil(product.expirationDate) }
      : product;
  }

  private daysUntil(isoDate: string): number {
    const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number);
    const expiry = new Date(year, month - 1, day).getTime();
    const today = new Date().setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((expiry - today) / DAY_MS));
  }

  private dateAfterDays(days: number): string {
    const date = new Date(Date.now() + days * DAY_MS);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }

  private toLocationEnum(locationName?: string): 'Fridge' | 'Pantry' | 'Freezer' {
    if (locationName === 'Zamrażarka') return 'Freezer';
    if (locationName === 'Spiżarnia') return 'Pantry';
    return 'Fridge';
  }
}

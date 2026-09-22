import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AppDatabase, ProductItem } from '../db/app-database';
import { NetworkService } from './network.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PantryService {
  private db = inject(AppDatabase);
  private network = inject(NetworkService);
  private http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiBaseUrl}/pantry/items`;
  readonly products = signal<ProductItem[]>([]);

  constructor() {
    this.loadInitialData();
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
      expirationDate: expiryFormatted  
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
        next: () => console.log('Zapisano pomyślnie w bazie PostgreSQL!'),
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

  async updateProduct(id: string, updates: { locationName: string; quantity: number; unit: string; expirationDate: string }): Promise<void> {
    const locEnum = updates.locationName === 'Zamrażarka' 
      ? 'Freezer' 
      : updates.locationName === 'Spiżarnia' 
        ? 'Pantry' 
        : 'Fridge';

    const expiryDays = Math.max(0, Math.ceil((new Date(updates.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

    await this.db.products.update(id, {
      locationName: updates.locationName,
      storageLocation: locEnum,
      category: updates.locationName.toLowerCase(),
      quantity: updates.quantity,
      unit: updates.unit,
      expirationDate: updates.expirationDate,
      expiryDays: expiryDays,
      updatedAt: Date.now()
    });

    this.products.update(items =>
      items.map(p => p.id === id ? {
        ...p,
        locationName: updates.locationName,
        storageLocation: locEnum,
        category: updates.locationName.toLowerCase(),
        quantity: updates.quantity,
        unit: updates.unit,
        expirationDate: updates.expirationDate,
        expiryDays: expiryDays
      } : p)
    );

   
    if (this.network.isOnline()) {
      const backendDto = {
        location: locEnum,
        quantity: updates.quantity,
        unit: updates.unit,
        expirationDate: updates.expirationDate
      };

      this.http.put(`${this.apiUrl}/${id}`, backendDto).subscribe({
        next: () => console.log('Zaktualizowano produkt na backendzie!'),
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
}
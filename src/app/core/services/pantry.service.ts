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

  readonly products = signal<ProductItem[]>([]);

  constructor() {
    this.loadInitialData();
  }

  async loadInitialData(): Promise<void> {
    const localItems = await this.db.products.toArray();
    this.products.set(localItems);

    if (this.network.isOnline()) {
      this.http.get<ProductItem[]>(`${environment.apiBaseUrl}/pantry-items`).subscribe({
        next: async (serverItems) => {
          await this.db.products.clear();
          await this.db.products.bulkPut(serverItems);
          this.products.set(serverItems);
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
    this.products.update(items => [...items, newProduct]);

    if (!isOnline) {
      await this.db.syncQueue.add({
        action: 'CREATE',
        entity: 'product',
        payload: newProduct,
        createdAt: Date.now()
      });
    } else {
      this.sendToBackend(newProduct);
    }
  }

  private sendToBackend(product: ProductItem): void {
    this.http.post(`${environment.apiBaseUrl}/pantry-items`, product).subscribe({
      next: () => console.log('Zapisano pomyślnie w PostgreSQL!'),
      error: async (err) => {
        console.error('Błąd zapisu na backendzie, wrzucam do kolejki sync:', err);
        await this.db.syncQueue.add({
          action: 'CREATE',
          entity: 'product',
          payload: product,
          createdAt: Date.now()
        });
      }
    });
  }
}
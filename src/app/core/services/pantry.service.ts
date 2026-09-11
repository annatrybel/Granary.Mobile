import { Injectable, inject, signal } from '@angular/core';
import { AppDatabase, ProductItem } from '../db/app-database';
import { NetworkService } from './network.service';

@Injectable({
  providedIn: 'root'
})
export class PantryService {
  private db = inject(AppDatabase);
  private network = inject(NetworkService);

  readonly products = signal<ProductItem[]>([]);

  constructor() {
    this.loadInitialData();
  }

  async loadInitialData(): Promise<void> {
    const localItems = await this.db.products.toArray();
    this.products.set(localItems);
  }

  async addProduct(product: Omit<ProductItem, 'id' | 'isSynced' | 'updatedAt'>): Promise<void> {
    const newProduct: ProductItem = {
      ...product,
      id: crypto.randomUUID(), 
      isSynced: this.network.isOnline(),
      updatedAt: Date.now()
    };

    await this.db.products.add(newProduct);
    
    this.products.update(items => [...items, newProduct]);

    if (!this.network.isOnline()) {
      await this.db.syncQueue.add({
        action: 'CREATE',
        entity: 'product',
        payload: newProduct,
        createdAt: Date.now()
      });
    } else {
      // Wyślij do backendu przez HTTP
      this.sendToBackend(newProduct);
    }
  }

  private sendToBackend(product: ProductItem): void {
    console.log('Sending to backend API...', product);
  }
}
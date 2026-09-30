import Dexie, { Table } from 'dexie';
import { Injectable } from '@angular/core';

export interface ProductItem {
  id: string;
  catalogProductId?: string | null;
  name: string;
  
  category?: string;        
  categoryName?: string;
  categoryId?: string;

  locationName?: string;         
  storageLocation?: string;
  imageUrl?: string;
  quantity: number;
  unit?: string;
  expiryDays?: number;
  expirationDate?: string;
  isSynced: boolean;
  updatedAt: number;
}

export interface OfflineShoppingList {
  id: string;
  name: string;
  items: OfflineShoppingItem[];
  isSynced: boolean;
  updatedAt: number;
}

export interface OfflineShoppingItem {
  id: string;
  name: string;
  categoryName: string;
  quantity: number;
  unit: string;
  isChecked: boolean;
}

export interface SyncTask<T = any> {
  id?: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'product' | 'shopping' | 'recipe';
  payload: T;
  retryCount?: number;           
  lastError?: string;
  createdAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class AppDatabase extends Dexie {
  products!: Table<ProductItem, string>;
  shoppingLists!: Table<OfflineShoppingList, string>;
  syncQueue!: Table<SyncTask, number>;

  constructor() {
    super('SmartPantryDatabase');

    this.version(1).stores({
      products: 'id, locationName, categoryName, expirationDate, isSynced, updatedAt',
      syncQueue: '++id, entity, action, createdAt'
    });

    this.version(2).stores({
      shoppingLists: 'id, isSynced, updatedAt'
    });
  }

  async queueSyncTask(action: 'CREATE' | 'UPDATE' | 'DELETE', entity: 'product' | 'shopping' | 'recipe', payload: any): Promise<number> {
    return await this.syncQueue.add({
      action,
      entity,
      payload,
      retryCount: 0,
      createdAt: Date.now()
    });
  }
}
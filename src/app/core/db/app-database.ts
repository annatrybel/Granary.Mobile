import Dexie, { Table } from 'dexie';
import { Injectable } from '@angular/core';

export interface ProductItem {
  id: string;
  catalogProductId?: string; 
  name: string;
  category?: string;
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

export interface SyncTask {
  id?: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'product' | 'shopping' | 'recipe';
  payload: any;
  createdAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class AppDatabase extends Dexie {
  products!: Table<ProductItem, string>;
  syncQueue!: Table<SyncTask, number>;

  constructor() {
    super('SmartPantryDatabase');

    this.version(1).stores({
      products: 'id, location, expiryDate, isSynced',
      syncQueue: '++id, entity, createdAt'
    });
  }
}
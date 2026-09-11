import Dexie, { Table } from 'dexie';
import { Injectable } from '@angular/core';

export interface ProductItem {
  id: string;
  name: string;
  location: 'lodowka' | 'zamrazarka' | 'spizarnia';
  quantity: number;
  expiryDate: string;
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
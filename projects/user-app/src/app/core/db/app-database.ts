import Dexie, { Table } from 'dexie';
import { Injectable } from '@angular/core';
import type { RecipeDetailDto, RecipeMatchDto, ShoppingItemDto, ShoppingListDto } from '@granary/shared';

export interface ProductItem {
  id: string;
  catalogProductId?: string | null;
  name: string;

  category?: string;
  categoryName?: string;
  categoryId?: string;
  categoryImageUrl?: string | null;

  locationName?: string;
  storageLocation?: string;
  imageUrl?: string | null;
  quantity: number;
  unit?: string;
  expiryDays?: number;
  expirationDate?: string;
  isSynced: boolean;
  updatedAt: number;
}

export interface OfflineShoppingList extends Omit<ShoppingListDto, 'items'> {
  items: ShoppingItemDto[];
  isSynced: boolean;
  updatedAt: number;
}

export interface OfflineRecipe extends RecipeMatchDto {
  isSynced: boolean;
  updatedAt: number;
}

export interface OfflineRecipeDetail extends RecipeDetailDto {
  updatedAt: number;
}

export interface SuggestedRecipe extends RecipeMatchDto {
  rank: number;
}

export interface IdMapping {
  tempId: string;
  serverId: string;
  entity: SyncEntity;
}

export type SyncEntity = 'product' | 'shoppingList' | 'shoppingItem' | 'recipe';

export type SyncAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'BULK_DELETE'
  | 'BULK_TRANSFER'
  | 'TOGGLE_FAVORITE'
  | 'VOTE';

export interface SyncTask<T = unknown> {
  id?: number;
  action: SyncAction;
  entity: SyncEntity;
  /** Identyfikator encji, której dotyczy zadanie (lokalny lub serwerowy). */
  entityId?: string;
  /** Identyfikator rodzica, np. listy zakupów dla pozycji. */
  parentId?: string;
  payload: T;
  retryCount?: number;
  lastError?: string;
  createdAt: number;
}

export type NewSyncTask<T = unknown> = Omit<SyncTask<T>, 'id' | 'retryCount' | 'lastError' | 'createdAt'>;

@Injectable({
  providedIn: 'root'
})
export class AppDatabase extends Dexie {
  products!: Table<ProductItem, string>;
  shoppingLists!: Table<OfflineShoppingList, string>;
  recipes!: Table<OfflineRecipe, string>;
  recipeDetails!: Table<OfflineRecipeDetail, string>;
  suggestedRecipes!: Table<SuggestedRecipe, string>;
  syncQueue!: Table<SyncTask, number>;
  idMap!: Table<IdMapping, string>;

  constructor() {
    super('SmartPantryDatabase');

    this.version(1).stores({
      products: 'id, locationName, categoryName, expirationDate, isSynced, updatedAt',
      syncQueue: '++id, entity, action, createdAt'
    });

    this.version(2).stores({
      shoppingLists: 'id, isSynced, updatedAt'
    });

    this.version(3).stores({
      syncQueue: '++id, entity, entityId, action, createdAt',
      recipes: 'recipeId, isFavorite, isCustom, updatedAt',
      recipeDetails: 'id',
      suggestedRecipes: 'recipeId, rank',
      idMap: 'tempId'
    });
  }

  newId(): string {
    return crypto.randomUUID();
  }

  /** Zwraca identyfikator nadany przez serwer, jeśli lokalny rekord został już zsynchronizowany. */
  async resolveId(id: string): Promise<string> {
    return (await this.idMap.get(id))?.serverId ?? id;
  }

  /** Dodaje zadanie do kolejki, mapując lokalne identyfikatory na serwerowe, jeśli są już znane. */
  async enqueue<T>(task: NewSyncTask<T>): Promise<number> {
    const entityId = task.entityId ? await this.resolveId(task.entityId) : undefined;
    const parentId = task.parentId ? await this.resolveId(task.parentId) : undefined;

    return this.syncQueue.add({
      ...task,
      entityId,
      parentId,
      retryCount: 0,
      createdAt: Date.now()
    });
  }

  /** Zapamiętuje mapowanie lokalnego ID na serwerowe i poprawia zadania czekające w kolejce. */
  async registerIdMapping(entity: SyncEntity, tempId: string, serverId: string): Promise<void> {
    if (!tempId || !serverId || tempId === serverId) return;

    await this.transaction('rw', this.idMap, this.syncQueue, async () => {
      await this.idMap.put({ tempId, serverId, entity });

      await this.syncQueue.toCollection().modify(task => {
        if (task.entityId === tempId) task.entityId = serverId;
        if (task.parentId === tempId) task.parentId = serverId;

        const payload = task.payload as { itemIds?: string[] } | null;
        if (payload?.itemIds?.includes(tempId)) {
          payload.itemIds = payload.itemIds.map(id => (id === tempId ? serverId : id));
        }
      });
    });
  }

  async pendingCount(...entities: SyncEntity[]): Promise<number> {
    if (entities.length === 0) return this.syncQueue.count();
    return this.syncQueue.where('entity').anyOf(entities).count();
  }
}

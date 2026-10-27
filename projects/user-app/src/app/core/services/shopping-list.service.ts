import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, defer, firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '@granary/shared';
import { AppDatabase, OfflineShoppingList, ProductItem } from '../db/app-database';
import { NetworkService } from './network.service';
import { SyncService } from './sync.service';

import type {
  ShoppingListDto,
  ShoppingItemDto,
  CreateShoppingListDto,
  AddShoppingItemDto,
  UpdateShoppingItemDto,
  BulkTransferToPantryDto,
  BulkTransferResultDto
} from '@granary/shared';

export type {
  ShoppingListDto,
  ShoppingItemDto,
  CreateShoppingListDto,
  AddShoppingItemDto,
  UpdateShoppingItemDto,
  BulkTransferToPantryDto,
  BulkTransferResultDto
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Listy zakupów działają offline: każda zmiana trafia najpierw do IndexedDB,
 * a następnie do kolejki synchronizacji wysyłanej na serwer, gdy jest sieć.
 */
@Injectable({
  providedIn: 'root'
})
export class ShoppingListService {
  private http = inject(HttpClient);
  private db = inject(AppDatabase);
  private network = inject(NetworkService);
  private sync = inject(SyncService);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly baseUrl = `${this.apiBaseUrl}/shopping-lists`;

  getMyLists(): Observable<ShoppingListDto[]> {
    return defer(async () => {
      if (await this.canPullFromServer()) {
        try {
          const lists = await firstValueFrom(this.http.get<ShoppingListDto[]>(this.baseUrl));
          await this.replaceCache(lists ?? []);
        } catch {
          // brak sieci lub błąd serwera: korzystamy z danych lokalnych
        }
      }

      const lists = await this.db.shoppingLists.toArray();
      return lists.sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));
    });
  }

  getListDetails(listId: string): Observable<ShoppingListDto> {
    return defer(async () => {
      if (await this.canPullFromServer()) {
        try {
          const id = await this.db.resolveId(listId);
          const dto = await firstValueFrom(this.http.get<ShoppingListDto>(`${this.baseUrl}/${id}`));
          await this.db.shoppingLists.put(this.toOfflineList(dto, await this.db.shoppingLists.get(id)));
        } catch {
          // brak sieci lub błąd serwera: korzystamy z danych lokalnych
        }
      }

      const list = await this.db.shoppingLists.get(await this.db.resolveId(listId));
      if (!list) throw new Error(`Nie znaleziono listy zakupów ${listId}`);
      return list;
    });
  }

  createList(dto: CreateShoppingListDto): Observable<ShoppingListDto> {
    return defer(async () => {
      const list: OfflineShoppingList = {
        id: this.db.newId(),
        name: dto.name,
        items: [],
        createdAt: new Date().toISOString(),
        isSynced: false,
        updatedAt: Date.now()
      };

      await this.db.shoppingLists.add(list);
      await this.db.enqueue({ action: 'CREATE', entity: 'shoppingList', entityId: list.id, payload: dto });
      await this.sync.flush();

      // Po synchronizacji lista może mieć już identyfikator nadany przez serwer.
      return (await this.db.shoppingLists.get(await this.db.resolveId(list.id))) ?? list;
    });
  }

  deleteList(listId: string): Observable<void> {
    return defer(async () => {
      const id = await this.db.resolveId(listId);
      await this.db.shoppingLists.delete(id);
      await this.db.enqueue({ action: 'DELETE', entity: 'shoppingList', entityId: id, payload: { id } });
      void this.sync.flush();
    });
  }

  addItem(listId: string, dto: AddShoppingItemDto): Observable<ShoppingItemDto> {
    return defer(async () => {
      const parentId = await this.db.resolveId(listId);
      const name = dto.customName || dto.productName || '';
      const item: ShoppingItemDto = {
        id: this.db.newId(),
        productId: dto.productId ?? null,
        name,
        productName: dto.productName || name,
        categoryName: dto.categoryName,
        quantity: dto.quantity,
        unit: dto.unit,
        isBought: false
      };

      await this.modifyList(parentId, list => ({ ...list, items: [item, ...list.items] }));
      await this.db.enqueue({ action: 'CREATE', entity: 'shoppingItem', entityId: item.id, parentId, payload: dto });
      void this.sync.flush();
      return item;
    });
  }

  updateItem(listId: string, itemId: string, dto: UpdateShoppingItemDto): Observable<ShoppingItemDto> {
    return defer(async () => {
      const parentId = await this.db.resolveId(listId);
      const id = await this.db.resolveId(itemId);
      let updated: ShoppingItemDto = { id, quantity: dto.quantity ?? 1, unit: dto.unit ?? 'szt.' };

      await this.modifyList(parentId, list => ({
        ...list,
        items: list.items.map(item => {
          if (item.id !== id) return item;
          updated = {
            ...item,
            ...(dto.name !== undefined ? { name: dto.name, productName: dto.name } : {}),
            ...(dto.quantity !== undefined ? { quantity: dto.quantity } : {}),
            ...(dto.unit !== undefined ? { unit: dto.unit } : {}),
            ...(dto.isBought !== undefined ? { isBought: dto.isBought } : {}),
            ...(dto.categoryName !== undefined ? { categoryName: dto.categoryName } : {})
          };
          return updated;
        })
      }));

      await this.db.enqueue({ action: 'UPDATE', entity: 'shoppingItem', entityId: id, parentId, payload: dto });
      void this.sync.flush();
      return updated;
    });
  }

  deleteItem(listId: string, itemId: string): Observable<void> {
    return defer(async () => {
      const parentId = await this.db.resolveId(listId);
      const id = await this.db.resolveId(itemId);

      await this.modifyList(parentId, list => ({ ...list, items: list.items.filter(item => item.id !== id) }));
      await this.db.enqueue({ action: 'DELETE', entity: 'shoppingItem', entityId: id, parentId, payload: { id } });
      void this.sync.flush();
    });
  }

  deleteSelectedItems(listId: string, itemIds: string[]): Observable<void> {
    return defer(async () => {
      const parentId = await this.db.resolveId(listId);
      const ids = await Promise.all(itemIds.map(id => this.db.resolveId(id)));
      const idSet = new Set(ids);

      await this.modifyList(parentId, list => ({ ...list, items: list.items.filter(item => !idSet.has(item.id)) }));
      await this.db.enqueue({ action: 'BULK_DELETE', entity: 'shoppingItem', parentId, payload: { itemIds: ids } });
      void this.sync.flush();
    });
  }

  bulkTransfer(listId: string, dto: BulkTransferToPantryDto): Observable<BulkTransferResultDto> {
    return defer(async () => {
      const parentId = await this.db.resolveId(listId);
      const ids = await Promise.all(dto.itemIds.map(id => this.db.resolveId(id)));
      const idSet = new Set(ids);
      const list = await this.db.shoppingLists.get(parentId);
      const transferred = (list?.items ?? []).filter(item => idSet.has(item.id));

      await this.db.products.bulkAdd(transferred.map(item => this.toProduct(item, dto)));
      await this.modifyList(parentId, current => ({ ...current, items: current.items.filter(item => !idSet.has(item.id)) }));
      await this.db.enqueue({
        action: 'BULK_TRANSFER',
        entity: 'shoppingItem',
        parentId,
        payload: { ...dto, itemIds: ids }
      });
      void this.sync.flush();

      return { transferredCount: transferred.length };
    });
  }

  /** Stan z serwera nadpisuje cache tylko wtedy, gdy nie ma lokalnych zmian czekających na wysłanie. */
  private async canPullFromServer(): Promise<boolean> {
    if (!this.network.isOnline()) return false;
    await this.sync.flush();
    return (await this.db.pendingCount('shoppingList', 'shoppingItem')) === 0;
  }

  private async replaceCache(lists: ShoppingListDto[]): Promise<void> {
    const existing = new Map((await this.db.shoppingLists.toArray()).map(list => [list.id, list]));
    const rows = lists.map(list => this.toOfflineList(list, existing.get(list.id)));

    await this.db.transaction('rw', this.db.shoppingLists, async () => {
      await this.db.shoppingLists.clear();
      await this.db.shoppingLists.bulkPut(rows);
    });
  }

  private toOfflineList(dto: ShoppingListDto, existing?: OfflineShoppingList): OfflineShoppingList {
    return {
      ...dto,
      items: dto.items ?? existing?.items ?? [],
      isSynced: true,
      updatedAt: Date.now()
    };
  }

  private async modifyList(
    listId: string,
    change: (list: OfflineShoppingList) => OfflineShoppingList
  ): Promise<void> {
    await this.db.transaction('rw', this.db.shoppingLists, async () => {
      const list = await this.db.shoppingLists.get(listId);
      if (list) {
        await this.db.shoppingLists.put({ ...change(list), isSynced: false, updatedAt: Date.now() });
      }
    });
  }

  private toProduct(item: ShoppingItemDto, dto: BulkTransferToPantryDto): ProductItem {
    const location = dto.destinationLocation ?? 'Pantry';
    const expirationDate = dto.defaultExpirationDate
      ? dto.defaultExpirationDate.slice(0, 10)
      : new Date(Date.now() + 7 * DAY_MS).toISOString().slice(0, 10);
    const locationName = location === 'Freezer' ? 'Zamrażarka' : location === 'Fridge' ? 'Lodówka' : 'Spiżarnia';

    return {
      id: this.db.newId(),
      catalogProductId: item.productId,
      name: item.productName || item.name || 'Produkt',
      categoryName: item.categoryName || item.category || 'Inne',
      locationName,
      quantity: item.quantity,
      unit: item.unit,
      expirationDate,
      expiryDays: 7,
      isSynced: false,
      updatedAt: Date.now()
    };
  }
}

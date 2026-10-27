import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL, AuthService } from '@granary/shared';
import { AppDatabase, SyncTask } from '../db/app-database';
import { NetworkService } from './network.service';

type TaskOutcome = 'done' | 'drop' | 'stop';

interface ServerEntity {
  id?: string;
  recipeId?: string;
  imageUrl?: string | null;
}

const MAX_RETRIES = 5;

/**
 * Wysyła na serwer zadania zapisane lokalnie (kolejka `syncQueue`) w kolejności ich utworzenia.
 * Po wykonaniu zadania `CREATE` podmienia lokalne ID encji na ID nadane przez serwer.
 */
@Injectable({ providedIn: 'root' })
export class SyncService {
  private readonly network = inject(NetworkService);
  private readonly auth = inject(AuthService);
  private readonly db = inject(AppDatabase);
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  private readonly pantryUrl = `${this.apiBaseUrl}/pantry/items`;
  private readonly shoppingUrl = `${this.apiBaseUrl}/shopping-lists`;
  private readonly recipesUrl = `${this.apiBaseUrl}/recipes`;

  private currentRun: Promise<void> | null = null;
  private rerunRequested = false;

  readonly isSyncing = signal(false);
  readonly pendingCount = signal(0);
  /** Zwiększa się po każdej synchronizacji, która zmieniła dane lokalne (np. ID encji). */
  readonly syncVersion = signal(0);

  constructor() {
    void this.refreshPendingCount();

    effect(() => {
      const canSync = this.network.isOnline() && this.auth.isAuthenticated();
      if (canSync) {
        untracked(() => void this.flush());
      }
    });
  }

  /** Opróżnia kolejkę. Zwrócona obietnica kończy się, gdy kolejka jest pusta albo nie da się jej dalej wysłać. */
  flush(): Promise<void> {
    if (this.currentRun) {
      this.rerunRequested = true;
      return this.currentRun;
    }
    if (!this.network.isOnline() || !this.auth.isAuthenticated()) return Promise.resolve();

    this.currentRun = this.runFlush().finally(() => (this.currentRun = null));
    return this.currentRun;
  }

  private async runFlush(): Promise<void> {
    this.isSyncing.set(true);
    let processed = 0;

    try {
      let stopped = false;
      do {
        this.rerunRequested = false;
        const result = await this.drainQueue();
        processed += result.processed;
        stopped = result.stopped;
      } while (this.rerunRequested && !stopped);
    } finally {
      this.isSyncing.set(false);
      await this.refreshPendingCount();
      if (processed > 0) {
        this.syncVersion.update(v => v + 1);
      }
    }
  }

  private async refreshPendingCount(): Promise<void> {
    this.pendingCount.set(await this.db.pendingCount());
  }

  private async drainQueue(): Promise<{ processed: number; stopped: boolean }> {
    let processed = 0;

    while (this.network.isOnline()) {
      const task = await this.db.syncQueue.orderBy('id').first();
      if (!task?.id) break;

      const outcome = await this.runTask(task);
      if (outcome === 'stop') return { processed, stopped: true };

      await this.db.syncQueue.delete(task.id);
      processed++;
      this.pendingCount.set(await this.db.pendingCount());
    }

    return { processed, stopped: false };
  }

  private async runTask(task: SyncTask): Promise<TaskOutcome> {
    try {
      await this.execute(task);
      return 'done';
    } catch (error) {
      return this.handleError(task, error);
    }
  }

  private async handleError(task: SyncTask, error: unknown): Promise<TaskOutcome> {
    if (!(error instanceof HttpErrorResponse)) {
      console.error('Nieoczekiwany błąd synchronizacji, zadanie pominięte:', task, error);
      return 'drop';
    }

    if (task.action === 'DELETE' && error.status === 404) return 'done';

    const isTemporary = [0, 401, 408, 429].includes(error.status);
    if (isTemporary) return 'stop';

    if (error.status >= 500) {
      const retryCount = (task.retryCount ?? 0) + 1;
      if (retryCount < MAX_RETRIES) {
        await this.db.syncQueue.update(task.id!, { retryCount, lastError: error.message });
        return 'stop';
      }
    }

    console.error('Serwer odrzucił zadanie synchronizacji, zadanie pominięte:', task, error);
    return 'drop';
  }

  private async execute(task: SyncTask): Promise<void> {
    switch (task.entity) {
      case 'product':
        return this.executeProduct(task);
      case 'shoppingList':
        return this.executeShoppingList(task);
      case 'shoppingItem':
        return this.executeShoppingItem(task);
      case 'recipe':
        return this.executeRecipe(task);
    }
  }

  private async executeProduct(task: SyncTask): Promise<void> {
    const id = task.entityId ?? (task.payload as { id?: string })?.id;

    switch (task.action) {
      case 'CREATE': {
        const server = await this.post<ServerEntity>(this.pantryUrl, task.payload);
        await this.replaceProductId(id, server);
        return;
      }
      case 'UPDATE': {
        const server = await this.send<ServerEntity>('put', `${this.pantryUrl}/${id}`, task.payload);
        if (id) {
          await this.db.products.update(id, {
            isSynced: true,
            ...(server?.imageUrl ? { imageUrl: server.imageUrl } : {})
          });
        }
        return;
      }
      case 'DELETE':
        await firstValueFrom(this.http.delete(`${this.pantryUrl}/${id}`));
        return;
    }
  }

  private async executeShoppingList(task: SyncTask): Promise<void> {
    switch (task.action) {
      case 'CREATE': {
        const server = await this.post<ServerEntity>(this.shoppingUrl, task.payload);
        const localId = task.entityId;
        const serverId = server?.id;
        if (!localId) return;

        const row = await this.db.shoppingLists.get(localId);
        if (!row) return;

        if (serverId && serverId !== localId) {
          await this.db.transaction('rw', this.db.shoppingLists, async () => {
            await this.db.shoppingLists.delete(localId);
            await this.db.shoppingLists.put({ ...row, id: serverId, isSynced: true });
          });
          await this.db.registerIdMapping('shoppingList', localId, serverId);
        } else {
          await this.db.shoppingLists.update(localId, { isSynced: true });
        }
        return;
      }
      case 'DELETE':
        await firstValueFrom(this.http.delete(`${this.shoppingUrl}/${task.entityId}`));
        return;
    }
  }

  private async executeShoppingItem(task: SyncTask): Promise<void> {
    const itemsUrl = `${this.shoppingUrl}/${task.parentId}/items`;

    switch (task.action) {
      case 'CREATE': {
        const server = await this.post<ServerEntity>(itemsUrl, task.payload);
        const localId = task.entityId;
        const serverId = server?.id;
        if (!localId || !serverId || !task.parentId) return;

        await this.db.shoppingLists
          .where('id')
          .equals(task.parentId)
          .modify(list => {
            list.items = list.items.map(item => (item.id === localId ? { ...item, id: serverId } : item));
          });
        await this.db.registerIdMapping('shoppingItem', localId, serverId);
        return;
      }
      case 'UPDATE':
        await this.send('put', `${itemsUrl}/${task.entityId}`, task.payload);
        return;
      case 'DELETE':
        await firstValueFrom(this.http.delete(`${itemsUrl}/${task.entityId}`));
        return;
      case 'BULK_DELETE':
        await this.post(`${itemsUrl}/bulk-delete`, (task.payload as { itemIds: string[] }).itemIds);
        return;
      case 'BULK_TRANSFER':
        await this.post(`${itemsUrl}/bulk-transfer`, task.payload);
        return;
    }
  }

  private async executeRecipe(task: SyncTask): Promise<void> {
    const id = task.entityId;

    switch (task.action) {
      case 'CREATE': {
        const server = await this.post<ServerEntity>(this.recipesUrl, task.payload);
        await this.replaceRecipeId(id, server);
        return;
      }
      case 'UPDATE':
        await this.send('put', `${this.recipesUrl}/${id}`, task.payload);
        return;
      case 'DELETE':
        await firstValueFrom(this.http.delete(`${this.recipesUrl}/${id}`));
        return;
      case 'TOGGLE_FAVORITE':
        await this.post(`${this.recipesUrl}/${id}/favorite`, {});
        return;
      case 'VOTE':
        await this.post(`${this.recipesUrl}/${id}/vote`, task.payload);
        return;
    }
  }

  private async replaceProductId(localId: string | undefined, server: ServerEntity | undefined): Promise<void> {
    if (!localId) return;

    const row = await this.db.products.get(localId);
    if (!row) return;

    const serverId = server?.id;
    if (serverId && serverId !== localId) {
      await this.db.transaction('rw', this.db.products, async () => {
        await this.db.products.delete(localId);
        await this.db.products.put({ ...row, id: serverId, isSynced: true, imageUrl: server?.imageUrl ?? row.imageUrl });
      });
      await this.db.registerIdMapping('product', localId, serverId);
    } else {
      await this.db.products.update(localId, { isSynced: true });
    }
  }

  private async replaceRecipeId(localId: string | undefined, server: ServerEntity | undefined): Promise<void> {
    if (!localId) return;

    const serverId = server?.id ?? server?.recipeId;
    const summary = await this.db.recipes.get(localId);
    const detail = await this.db.recipeDetails.get(localId);

    await this.db.transaction('rw', this.db.recipes, this.db.recipeDetails, async () => {
      if (summary) {
        await this.db.recipes.delete(localId);
        await this.db.recipes.put({ ...summary, recipeId: serverId ?? localId, isSynced: true });
      }
      if (detail) {
        await this.db.recipeDetails.delete(localId);
        await this.db.recipeDetails.put({ ...detail, id: serverId ?? localId });
      }
    });

    if (serverId) {
      await this.db.registerIdMapping('recipe', localId, serverId);
    }
  }

  private async post<T = unknown>(url: string, body: unknown): Promise<T | undefined> {
    return this.send<T>('post', url, body);
  }

  private async send<T = unknown>(method: 'post' | 'put', url: string, body: unknown): Promise<T | undefined> {
    const request$ = method === 'post'
      ? this.http.post<{ data?: T; result?: T } | T>(url, body)
      : this.http.put<{ data?: T; result?: T } | T>(url, body);
    const res = await firstValueFrom(request$);
    const wrapped = res as { data?: T; result?: T } | null;
    return (wrapped?.data ?? wrapped?.result ?? res) as T | undefined;
  }
}

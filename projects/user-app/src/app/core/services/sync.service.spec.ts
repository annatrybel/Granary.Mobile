import Dexie from 'dexie';
import { IDBKeyRange, indexedDB } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { AuthService } from '@granary/shared';
import { AppDatabase, ProductItem } from '../db/app-database';
import { SyncService } from './sync.service';

Dexie.dependencies.indexedDB = indexedDB;
Dexie.dependencies.IDBKeyRange = IDBKeyRange;

describe('SyncService', () => {
  let db: AppDatabase;
  let sync: SyncService;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { isAuthenticated: signal(true) } }
      ]
    });

    db = TestBed.inject(AppDatabase);
    await Promise.all([db.products.clear(), db.syncQueue.clear(), db.idMap.clear(), db.shoppingLists.clear()]);
    sync = TestBed.inject(SyncService);
    http = TestBed.inject(HttpTestingController);
  });

  const product = (id: string): ProductItem => ({
    id,
    name: 'Mleko',
    quantity: 1,
    unit: 'szt.',
    isSynced: false,
    updatedAt: Date.now()
  });

  const respond = async (method: string, url: string, body: object) => {
    await vi.waitFor(() => http.expectOne(r => r.method === method && r.url === url)).then(req => req.flush(body));
  };

  it('replaces the local product id with the server id and redirects queued changes', async () => {
    await db.products.add(product('local-1'));
    await db.enqueue({ action: 'CREATE', entity: 'product', entityId: 'local-1', payload: { productId: 'p1' } });
    await db.enqueue({ action: 'UPDATE', entity: 'product', entityId: 'local-1', payload: { quantity: 3 } });

    const flushing = sync.flush();
    await respond('POST', '/api/pantry/items', { id: 'server-1' });
    await respond('PUT', '/api/pantry/items/server-1', {});
    await flushing;

    expect(await db.syncQueue.count()).toBe(0);
    expect(await db.products.get('local-1')).toBeUndefined();
    expect((await db.products.get('server-1'))?.isSynced).toBe(true);
    expect(await db.resolveId('local-1')).toBe('server-1');
    expect(sync.syncVersion()).toBe(1);
  });

  it('keeps tasks in the queue when the network is unavailable', async () => {
    await db.enqueue({ action: 'DELETE', entity: 'product', entityId: 'p1', payload: { id: 'p1' } });

    const flushing = sync.flush();
    const req = await vi.waitFor(() => http.expectOne('/api/pantry/items/p1'));
    req.error(new ProgressEvent('error'), { status: 0 });
    await flushing;

    expect(await db.syncQueue.count()).toBe(1);
    expect(sync.pendingCount()).toBe(1);
  });

  it('drops tasks rejected by the server so they do not block the queue', async () => {
    await db.enqueue({ action: 'UPDATE', entity: 'product', entityId: 'p1', payload: {} });
    await db.enqueue({ action: 'DELETE', entity: 'product', entityId: 'p2', payload: { id: 'p2' } });

    const flushing = sync.flush();
    const rejected = await vi.waitFor(() => http.expectOne(r => r.method === 'PUT'));
    rejected.flush({ message: 'invalid' }, { status: 400, statusText: 'Bad Request' });
    await respond('DELETE', '/api/pantry/items/p2', {});
    await flushing;

    expect(await db.syncQueue.count()).toBe(0);
  });

  it('maps temporary shopping list and item ids to server ids', async () => {
    await db.shoppingLists.add({
      id: 'list-local',
      name: 'Zakupy',
      items: [{ id: 'item-local', name: 'Chleb', quantity: 1, unit: 'szt.' }],
      isSynced: false,
      updatedAt: Date.now()
    });
    await db.enqueue({ action: 'CREATE', entity: 'shoppingList', entityId: 'list-local', payload: { name: 'Zakupy' } });
    await db.enqueue({
      action: 'CREATE',
      entity: 'shoppingItem',
      entityId: 'item-local',
      parentId: 'list-local',
      payload: { customName: 'Chleb', quantity: 1, unit: 'szt.' }
    });

    const flushing = sync.flush();
    await respond('POST', '/api/shopping-lists', { id: 'list-server' });
    await respond('POST', '/api/shopping-lists/list-server/items', { id: 'item-server' });
    await flushing;

    const list = await db.shoppingLists.get('list-server');
    expect(list?.items.map(item => item.id)).toEqual(['item-server']);
    expect(await db.shoppingLists.get('list-local')).toBeUndefined();
  });
});

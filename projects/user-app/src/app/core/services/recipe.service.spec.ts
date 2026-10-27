import Dexie from 'dexie';
import { IDBKeyRange, indexedDB } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService, RecipeMatchDto } from '@granary/shared';
import { AppDatabase } from '../db/app-database';
import { NetworkService } from './network.service';
import { RecipeService } from './recipe.service';

Dexie.dependencies.indexedDB = indexedDB;
Dexie.dependencies.IDBKeyRange = IDBKeyRange;

const recipe = (id: string, matchPercentage: number, expiringIngredientsSaved: number): RecipeMatchDto => ({
  recipeId: id,
  title: `Przepis ${id}`,
  prepTimeMinutes: 20,
  servings: 2,
  matchPercentage,
  ownedIngredientsCount: 1,
  totalIngredientsCount: 2,
  expiringIngredientsSaved,
  canBeCookedNow: false,
  isFavorite: false,
  isCustom: false,
  missingIngredients: []
});

describe('RecipeService suggestions', () => {
  const isOnline = signal(true);
  let db: AppDatabase;
  let service: RecipeService;
  let http: HttpTestingController;

  beforeEach(async () => {
    isOnline.set(true);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { isAuthenticated: signal(false) } },
        { provide: NetworkService, useValue: { isOnline } }
      ]
    });

    db = TestBed.inject(AppDatabase);
    await Promise.all([db.recipes.clear(), db.suggestedRecipes.clear(), db.syncQueue.clear()]);
    service = TestBed.inject(RecipeService);
    http = TestBed.inject(HttpTestingController);
  });

  it('returns three recipes, preferring those that save expiring products, and caches them', async () => {
    const result = firstValueFrom(service.getSuggestedRecipes(['catalog-1'], 3));

    const withExpiring = await vi.waitFor(() =>
      http.expectOne(r => r.url === '/api/recipes' && r.params.get('items') === 'catalog-1')
    );
    withExpiring.flush({
      items: [recipe('a', 90, 0), recipe('b', 40, 2)],
      totalCount: 2
    });

    const general = await vi.waitFor(() =>
      http.expectOne(r => r.url === '/api/recipes' && !r.params.has('items'))
    );
    general.flush({
      items: [recipe('a', 90, 0), recipe('c', 70, 0), recipe('d', 60, 1), recipe('e', 10, 0)],
      totalCount: 4
    });

    const suggestions = await result;
    expect(suggestions.map(r => r.recipeId)).toEqual(['b', 'd', 'a']);
    expect((await db.suggestedRecipes.orderBy('rank').toArray()).map(r => r.recipeId)).toEqual(['b', 'd', 'a']);
  });

  it('serves the last suggestions from the local cache when offline', async () => {
    await db.suggestedRecipes.bulkPut([
      { ...recipe('x', 50, 1), rank: 0 },
      { ...recipe('y', 40, 0), rank: 1 }
    ]);
    isOnline.set(false);

    const suggestions = await firstValueFrom(service.getSuggestedRecipes([], 3));

    expect(suggestions.map(r => r.recipeId)).toEqual(['x', 'y']);
    http.verify();
  });
});

import {
  Component,
  signal,
  computed,
  inject,
  effect,
  untracked,
  ChangeDetectionStrategy
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, catchError, debounceTime, of, switchMap, tap } from 'rxjs';

import { PantryService } from '../core/services/pantry.service';
import { RecipeService } from '../core/services/recipe.service';
import { ProductItem } from '../core/db/app-database';
import { AuthService, RecipeMatchDto, TranslatePipe, TranslationService } from '@granary/shared';
import { ExpiringItem, StockSection } from './models/dashboard.models';

type StorageKind = 'fridge' | 'pantry' | 'freezer';

const EXPIRING_WITHIN_DAYS = 4;
const EXPIRING_LIST_LIMIT = 5;
const SUGGESTED_RECIPES_LIMIT = 3;

const STORAGE_ICONS: Record<StorageKind, string> = {
  fridge: '/icons/fridge.svg',
  pantry: '/icons/pantry.svg',
  freezer: '/icons/freezer.svg'
};

const STORAGE_LABELS: Record<StorageKind, { key: string; fallback: string }> = {
  fridge: { key: 'inventory.locFridge', fallback: 'Lodówka' },
  pantry: { key: 'inventory.locPantry', fallback: 'Spiżarnia' },
  freezer: { key: 'inventory.locFreezer', fallback: 'Zamrażarka' }
};

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, LucideAngularModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent {
  private readonly pantryService = inject(PantryService);
  private readonly authService = inject(AuthService);
  private readonly recipeService = inject(RecipeService);
  protected readonly translationService = inject(TranslationService);

  private readonly recipeRequests$ = new Subject<string[]>();

  readonly userName = computed(() => {
    const user = this.authService.currentUser();
    const name = user?.name || user?.userName || (user?.email ? user.email.split('@')[0] : '');
    return name ? name.toUpperCase() : this.translationService.translate('dashboard.defaultUser', 'W KUCHNI');
  });

  readonly recipes = signal<RecipeMatchDto[]>([]);
  readonly isLoadingRecipes = signal<boolean>(true);

  private readonly products = this.pantryService.products;

  private readonly expiringProducts = computed(() =>
    this.products()
      .filter(p => (p.expiryDays ?? Number.MAX_SAFE_INTEGER) <= EXPIRING_WITHIN_DAYS)
      .sort((a, b) => (a.expiryDays ?? 0) - (b.expiryDays ?? 0))
  );

  readonly expiringItems = computed<ExpiringItem[]>(() => {
    this.translationService.currentLang();

    return this.expiringProducts()
      .slice(0, EXPIRING_LIST_LIMIT)
      .map(product => {
        const kind = this.storageKind(product);
        const daysLeft = product.expiryDays ?? 0;

        return {
          id: product.id,
          name: product.name,
          categoryName: product.categoryName ?? '',
          categoryIcon: product.categoryImageUrl ?? null,
          locationName: this.storageLabel(kind),
          locationIcon: STORAGE_ICONS[kind],
          timeLeftText: this.formatTimeLeft(daysLeft),
          daysLeft,
          productImageUrl: product.imageUrl
        };
      });
  });

  readonly stockSections = computed<StockSection[]>(() => {
    this.translationService.currentLang();
    const all = this.products();

    return (['fridge', 'pantry', 'freezer'] as const).map(type => ({
      title: this.storageLabel(type),
      count: all.filter(p => this.storageKind(p) === type).length,
      icon: STORAGE_ICONS[type],
      type
    }));
  });

  /** Identyfikatory produktów z katalogu, które niedługo się przeterminują. */
  private readonly expiringCatalogIds = computed(() =>
    this.expiringProducts()
      .map(p => p.catalogProductId)
      .filter((id): id is string => !!id)
      .join(',')
  );

  constructor() {
    this.recipeRequests$.pipe(
      debounceTime(150),
      tap(() => this.isLoadingRecipes.set(true)),
      switchMap(ids =>
        this.recipeService.getSuggestedRecipes(ids, SUGGESTED_RECIPES_LIMIT).pipe(
          catchError(err => {
            console.error('Błąd pobierania przepisów na pulpicie:', err);
            return of<RecipeMatchDto[]>([]);
          })
        )
      ),
      takeUntilDestroyed()
    ).subscribe(recipes => {
      this.recipes.set(recipes);
      this.isLoadingRecipes.set(false);
    });

    effect(() => {
      this.translationService.currentLang();
      const ids = this.expiringCatalogIds();
      untracked(() => this.recipeRequests$.next(ids ? ids.split(',') : []));
    });
  }

  private storageKind(product: ProductItem): StorageKind {
    const text = `${product.storageLocation ?? ''} ${product.locationName ?? ''}`.toLowerCase();
    if (text.includes('freezer') || text.includes('zamraż') || product.storageLocation === '2') return 'freezer';
    if (text.includes('pantry') || text.includes('spiż') || product.storageLocation === '1') return 'pantry';
    return 'fridge';
  }

  private storageLabel(kind: StorageKind): string {
    const { key, fallback } = STORAGE_LABELS[kind];
    return this.translationService.translate(key, fallback);
  }

  private formatTimeLeft(days: number): string {
    if (days <= 0) return this.translationService.translate('dashboard.today', 'Dzisiaj!');
    if (days === 1) return this.translationService.translate('dashboard.hours24', 'Zostało 24h');
    if (days === 2) return this.translationService.translate('dashboard.hours48', 'Zostało 48h');

    const daysLabel = this.translationService.translate('common.days', 'dni');
    const leftLabel = this.translationService.translate('dashboard.leftPrefix', 'Zostało');
    return `${leftLabel} ${days} ${daysLabel}`;
  }
}

import {
  Component,
  signal,
  computed,
  inject,
  effect,
  untracked,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { RecipeService } from '../core/services/recipe.service';
import { ShoppingListService, ShoppingListDto, AddShoppingItemDto } from '../core/services/shopping-list.service';
import {
  RecipeMatchDto,
  RecipeDetailDto,
  RecipeFilters,
  RecipeTabScope,
  CreateCustomRecipePayload,
  APP_ICONS,
  TranslatePipe,
  TranslationService,
  ConfirmDeleteModalComponent
} from '@granary/shared';

import { RecipeSearchBarComponent } from './components/recipe-search-bar/recipe-search-bar.component';
import { RecipeCardComponent } from './components/recipe-card/recipe-card.component';
import { RecipeDetailSheetComponent } from './components/recipe-detail-sheet/recipe-detail-sheet.component';
import { RecipeFilterSheetComponent } from './components/recipe-filter-sheet/recipe-filter-sheet.component';
import { AddRecipeSheetComponent } from './components/add-recipe-sheet/add-recipe-sheet.component';

interface ScopeTabOption {
  scope: RecipeTabScope;
  labelKey: string;
  fallbackLabel: string;
  icon?: string;
}

const isScope = (s: string | null): s is RecipeTabScope => ['all', 'favorites', 'custom'].includes(s as any);

@Component({
  selector: 'app-recipes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RecipeSearchBarComponent,
    RecipeCardComponent,
    RecipeDetailSheetComponent,
    RecipeFilterSheetComponent,
    AddRecipeSheetComponent,
    ConfirmDeleteModalComponent,
    TranslatePipe,
    APP_ICONS
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recipes.component.html',
  styleUrl: './recipes.component.scss'
})
export class RecipesComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly recipeService = inject(RecipeService);
  private readonly shoppingListService = inject(ShoppingListService);
  private readonly translationService = inject(TranslationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  @ViewChild('scrollSentinel') scrollSentinel?: ElementRef<HTMLDivElement>;
  private observer?: IntersectionObserver;
  private readonly searchSubject = new Subject<string>();

  private detailSub?: Subscription;
  private fetchSub?: Subscription;
  private initialInFlight = false;
  private detailRequestId = 0;
  private sentinelVisible = false;

  // Stany główne listy
  readonly activeScope = signal<RecipeTabScope>('all');
  readonly searchQuery = signal<string>('');
  readonly selectedItemsFilter = signal<string | null>(null);
  readonly recipes = signal<RecipeMatchDto[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly isLoadingMore = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly scopeTabs: ScopeTabOption[] = [
    { scope: 'all', labelKey: 'recipes.scopeAll', fallbackLabel: 'Wszystkie' },
    { scope: 'favorites', labelKey: 'recipes.scopeFavorites', fallbackLabel: 'Ulubione', icon: 'heart' },
    { scope: 'custom', labelKey: 'recipes.scopeCustom', fallbackLabel: 'Moje przepisy', icon: 'book-open' }
  ];

  readonly currentHeaderTitle = computed(() => {
    if (this.selectedItemsFilter()) return this.translationService.translate('recipes.headerWand', 'Dania z zaznaczonych produktów');
    if (this.searchQuery()) return this.translationService.translate('recipes.headerSearch', 'Wyniki wyszukiwania');
    if (this.activeScope() === 'favorites') return this.translationService.translate('recipes.headerFavorites', 'Twoje ulubione dania');
    if (this.activeScope() === 'custom') return this.translationService.translate('recipes.headerCustom', 'Przepisy z domowej bazy');
    return this.translationService.translate('recipes.headerDefault', 'Zrób z tego, co masz');
  });

  // Stany arkuszy i modali
  readonly activeRecipeDetail = signal<RecipeDetailDto | null>(null);
  readonly recipeBeingEdited = signal<RecipeDetailDto | null>(null);
  readonly recipeToDelete = signal<RecipeMatchDto | null>(null);
  readonly recipeForShoppingList = signal<RecipeMatchDto | null>(null);
  readonly isFilterSheetOpen = signal<boolean>(false);
  readonly isAddRecipeOpen = signal<boolean>(false);

  // Stany dodawania do listy zakupów
  readonly userShoppingLists = signal<ShoppingListDto[]>([]);
  readonly selectedShoppingListId = signal<string | null>(null);
  readonly isLoadingLists = signal<boolean>(false);
  readonly isAddingToShoppingList = signal<boolean>(false);

  private currentPage = 1;
  private readonly pageSize = 20;
  private hasMorePages = true;
  private isFirstLangRun = true;

  readonly activeFilters = signal<RecipeFilters>({ maxTime: null, sortBy: 'match', mealType: null, diet: null });

  constructor() {
    this.searchSubject.pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(query => {
        this.searchQuery.set(query);
        this.resetAndReload();
      });

    effect(() => {
      this.translationService.currentLang();
      untracked(() => {
        if (this.isFirstLangRun) {
          this.isFirstLangRun = false;
          return;
        }
        this.resetAndReload();
      });
    });
  }

  ngOnInit(): void {
    const scopeParam = this.route.snapshot.queryParamMap.get('scope');
    if (isScope(scopeParam)) this.activeScope.set(scopeParam);

    const itemsParam = this.route.snapshot.queryParamMap.get('items');
    if (itemsParam) this.selectedItemsFilter.set(itemsParam);

    this.fetchData(true);

    const targetId = this.route.snapshot.queryParamMap.get('recipeId');
    if (targetId) this.openRecipeDetail(targetId);
  }

  ngAfterViewInit(): void {
    if (!this.scrollSentinel?.nativeElement) return;
    this.observer = new IntersectionObserver(([entry]) => {
      this.sentinelVisible = entry.isIntersecting;
      this.loadMoreIfNeeded();
    }, { rootMargin: '250px' });
    this.observer.observe(this.scrollSentinel.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.fetchSub?.unsubscribe();
    this.detailSub?.unsubscribe();
  }

  // --- NAWIGACJA & FILTRY ---
  setScope(scope: RecipeTabScope): void {
    if (this.activeScope() === scope) return;
    this.activeScope.set(scope);
    this.updateQuery({ scope: scope === 'all' ? null : scope });
    this.resetAndReload();
  }

  onSearchChange(query: string): void {
    this.searchSubject.next(query);
  }

  onFiltersApplied(filters: RecipeFilters): void {
    this.activeFilters.set(filters);
    this.resetAndReload();
  }

  onFiltersReset(): void {
    this.activeFilters.set({ maxTime: null, sortBy: 'match', mealType: null, diet: null });
    this.resetAndReload();
  }

  clearSelectedItemsFilter(): void {
    this.selectedItemsFilter.set(null);
    this.updateQuery({ items: null });
    this.resetAndReload();
  }

  private updateQuery(queryParams: Record<string, any>): void {
    this.router.navigate([], { relativeTo: this.route, queryParams, queryParamsHandling: 'merge', replaceUrl: true });
  }

  // --- POBIERANIE DANYCH ---
  private resetAndReload(): void {
    this.currentPage = 1;
    this.hasMorePages = true;
    this.recipes.set([]);
    this.fetchData(true);
  }

  private fetchData(isInitial: boolean): void {
    if (isInitial) {
      this.isLoading.set(true);
      this.errorMessage.set(null);
    } else {
      this.isLoadingMore.set(true);
    }

    const filters = this.activeFilters();
    this.fetchSub?.unsubscribe();
    this.initialInFlight = isInitial;

    this.fetchSub = this.recipeService.getRecipes({
      scope: this.activeScope(),
      query: this.searchQuery(),
      items: this.selectedItemsFilter() || undefined,
      maxTime: filters.maxTime,
      sortBy: filters.sortBy,
      mealType: filters.mealType,
      diet: filters.diet,
      page: this.currentPage,
      pageSize: this.pageSize
    }).subscribe({
      next: (res) => {
        const newItems = res?.items ?? [];
        this.hasMorePages = res?.hasMore ?? (newItems.length === this.pageSize);
        if (isInitial) this.recipes.set(newItems);
        else this.recipes.update(curr => [...curr, ...newItems]);
        this.isLoading.set(false);
        this.isLoadingMore.set(false);
      },
      complete: () => {
        this.initialInFlight = false;
        this.loadMoreIfNeeded();
      },
      error: () => {
        this.initialInFlight = false;
        if (isInitial && this.recipes().length === 0) this.errorMessage.set('Wystąpił problem z pobraniem przepisów.');
        this.isLoading.set(false);
        this.isLoadingMore.set(false);
        if (!isInitial) this.hasMorePages = false;
      }
    });
  }

  private loadMoreIfNeeded(): void {
    if (!this.sentinelVisible || this.initialInFlight || this.isLoading() || this.isLoadingMore() || !this.hasMorePages) return;
    this.currentPage++;
    this.fetchData(false);
  }

  // --- AKCJE PRZEPISÓW (CRUD & ULUBIONE) ---
  toggleFavorite(recipeId: string): void {
    if (!recipeId) return;
    this.updateFavState(recipeId);

    this.recipeService.toggleFavorite(recipeId).subscribe({
      error: () => this.updateFavState(recipeId) // Cofnięcie stanu w razie błędu sieci
    });
  }

  private updateFavState(id: string): void {
    this.recipes.update(list => list.map(r => r.recipeId === id ? { ...r, isFavorite: !r.isFavorite } : r));
    this.activeRecipeDetail.update(curr => curr?.id === id ? { ...curr, isFavorite: !curr.isFavorite } : curr);
  }

  openAddRecipe(): void {
    this.recipeBeingEdited.set(null);
    this.isAddRecipeOpen.set(true);
  }

  openEditRecipe(recipe: RecipeMatchDto): void {
    this.recipeService.getById(recipe.recipeId).subscribe(detail => {
      this.recipeBeingEdited.set(detail);
      this.isAddRecipeOpen.set(true);
    });
  }

  closeAddOrEditRecipe(): void {
    this.recipeBeingEdited.set(null);
    this.isAddRecipeOpen.set(false);
  }

  onSaveRecipePayload(payload: CreateCustomRecipePayload): void {
    const edited = this.recipeBeingEdited();
    const action$ = edited ? this.recipeService.updateRecipe(edited.id, payload) : this.recipeService.createRecipe(payload);

    action$.subscribe(() => {
      this.closeAddOrEditRecipe();
      if (!edited) this.activeScope.set('custom');
      this.resetAndReload();
    });
  }

  askDeleteRecipe(recipe: RecipeMatchDto): void {
    this.recipeToDelete.set(recipe);
  }

  cancelDeleteRecipe(): void {
    this.recipeToDelete.set(null);
  }

  confirmDeleteRecipe(): void {
    const target = this.recipeToDelete();
    if (!target) return;

    this.recipeService.deleteRecipe(target.recipeId).subscribe(() => {
      this.recipes.update(list => list.filter(r => r.recipeId !== target.recipeId));
      this.recipeToDelete.set(null);
    });
  }

  // --- MODAL SZCZEGÓŁÓW PRZEPISU ---
  openRecipeDetail(recipeId: string, summary?: RecipeMatchDto): void {
    if (!recipeId) return;
    this.detailSub?.unsubscribe();
    const reqId = ++this.detailRequestId;

    this.activeRecipeDetail.set(summary ? {
      ...summary,
      id: summary.recipeId,
      instructions: '',
      isCustom: summary.isCustom ?? false,
      likesCount: 0,
      dislikesCount: 0,
      ingredients: []
    } : null);

    this.detailSub = this.recipeService.getById(recipeId).subscribe({
      next: (detail) => {
        if (reqId === this.detailRequestId) this.activeRecipeDetail.set(detail);
      },
      error: () => this.detailSub = undefined
    });
  }

  onCloseRecipeDetail(): void {
    this.detailSub?.unsubscribe();
    this.detailSub = undefined;
    this.detailRequestId++;
    this.activeRecipeDetail.set(null);
    if (this.route.snapshot.queryParamMap.has('recipeId')) {
      this.updateQuery({ recipeId: null });
    }
  }

  // --- MODAL DODAWANIA DO LISTY ZAKUPÓW ---
  openShoppingListModal(recipe: RecipeMatchDto): void {
    this.recipeForShoppingList.set(recipe);
    this.isLoadingLists.set(true);

    this.shoppingListService.getMyLists().subscribe({
      next: (lists) => {
        this.userShoppingLists.set(lists || []);
        if (lists?.[0]) this.selectedShoppingListId.set(lists[0].id);
        this.isLoadingLists.set(false);
      },
      error: () => this.isLoadingLists.set(false)
    });
  }

  confirmAddMissingToShoppingList(recipe: RecipeMatchDto): void {
    const listId = this.selectedShoppingListId();
    if (!listId) {
      alert(this.translationService.translate('recipes.chooseListAlert', 'Wybierz listę zakupów!'));
      return;
    }

    if (!recipe.missingIngredients?.length) {
      this.recipeForShoppingList.set(null);
      return;
    }

    this.isAddingToShoppingList.set(true);
    const payload: AddShoppingItemDto[] = recipe.missingIngredients.map(item => ({
      productId: item.productId || undefined,
      customName: item.productId ? undefined : item.productName,
      productName: item.productName,
      quantity: item.quantity > 0 ? item.quantity : 1,
      unit: item.unit
    }));

    this.shoppingListService.addItemsBulk(listId, payload).subscribe({
      next: (addedCount) => {
        this.isAddingToShoppingList.set(false);
        this.recipeForShoppingList.set(null);
        alert(this.translationService.translate(
          addedCount === 0 ? 'recipes.allAlreadyOnList' : 'recipes.addedSuccess',
          addedCount === 0
            ? 'Wszystkie brakujące składniki znajdują się już na tej liście zakupów!'
            : `Dodano ${addedCount} nowych pozycji do listy zakupów.`
        ));
      },
      error: () => {
        this.isAddingToShoppingList.set(false);
        alert(this.translationService.translate('recipes.addedError', 'Nie udało się dodać produktów do listy zakupów.'));
      }
    });
  }
}
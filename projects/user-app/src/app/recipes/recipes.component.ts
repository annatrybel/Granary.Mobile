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
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { RecipeService } from '@granary/user-app/core/services/recipe.service';
import {
  RecipeMatchDto,
  RecipeDetailDto,
  RecipeFilters,
  RecipeTabScope,
  CreateCustomRecipePayload
} from '@granary/shared';
import { TranslatePipe } from '@granary/shared';

import { RecipeSearchBarComponent } from './components/recipe-search-bar/recipe-search-bar.component';
import { RecipeCardComponent } from './components/recipe-card/recipe-card.component';
import { RecipeDetailSheetComponent } from './components/recipe-detail-sheet/recipe-detail-sheet.component';
import { RecipeFilterSheetComponent } from './components/recipe-filter-sheet/recipe-filter-sheet.component';
import { AddRecipeSheetComponent } from './components/add-recipe-sheet/add-recipe-sheet.component';
import { ConfirmDeleteModalComponent } from '@granary/shared';
import { TranslationService } from '@granary/shared';

interface ScopeTabOption {
  scope: RecipeTabScope;
  labelKey: string;
  fallbackLabel: string;
  icon?: string;
}

@Component({
  selector: 'app-recipes',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    RecipeSearchBarComponent,
    RecipeCardComponent,
    RecipeDetailSheetComponent,
    RecipeFilterSheetComponent,
    AddRecipeSheetComponent,
    ConfirmDeleteModalComponent,
    TranslatePipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recipes.component.html',
  styleUrl: './recipes.component.scss'
})
export class RecipesComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly recipeService = inject(RecipeService);
  private readonly translationService = inject(TranslationService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  @ViewChild('scrollSentinel') scrollSentinel?: ElementRef<HTMLDivElement>;
  private observer?: IntersectionObserver;
  private readonly searchSubject = new Subject<string>();

  private detailSub?: Subscription;

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

  private currentPage = 1;
  private readonly pageSize = 20;
  private hasMorePages = true;
  private isFirstLangRun = true;

  readonly activeFilters = signal<RecipeFilters>({
    maxTime: null,
    sortBy: 'match',
    mealType: null,
    diet: null
  });

  constructor() {
    this.searchSubject.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      takeUntilDestroyed()
    ).subscribe(query => {
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
    const itemsParam = this.route.snapshot.queryParamMap.get('items');
    if (itemsParam) this.selectedItemsFilter.set(itemsParam);

    this.fetchData(true);

    const targetRecipeId = this.route.snapshot.queryParamMap.get('recipeId');
    if (targetRecipeId) {
      this.openRecipeDetail(targetRecipeId);
    }
  }

  ngAfterViewInit(): void {
    if (!this.scrollSentinel?.nativeElement) return;
    this.observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !this.isLoading() && !this.isLoadingMore() && this.hasMorePages) {
        this.currentPage++;
        this.fetchData(false);
      }
    }, { rootMargin: '250px' });
    this.observer.observe(this.scrollSentinel.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.detailSub?.unsubscribe();
  }

  setScope(scope: RecipeTabScope): void {
    if (this.activeScope() === scope) return;
    this.activeScope.set(scope);
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
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { items: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
    this.resetAndReload();
  }

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
    this.recipeService.getRecipes({
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
        this.cdr.markForCheck();
      },
      error: () => {
        if (isInitial) this.errorMessage.set('Wystąpił problem z pobraniem przepisów.');
        this.isLoading.set(false);
        this.isLoadingMore.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  openAddRecipe(): void {
    this.recipeBeingEdited.set(null);
    this.isAddRecipeOpen.set(true);
  }

  openEditRecipe(recipe: RecipeMatchDto): void {
    this.recipeService.getById(recipe.recipeId).subscribe(detail => {
      this.recipeBeingEdited.set(detail);
      this.isAddRecipeOpen.set(true);
      this.cdr.markForCheck();
    });
  }

  closeAddOrEditRecipe(): void {
    this.recipeBeingEdited.set(null);
    this.isAddRecipeOpen.set(false);
  }

  onSaveRecipePayload(payload: CreateCustomRecipePayload): void {
    const edited = this.recipeBeingEdited();
    const action$ = edited
      ? this.recipeService.updateRecipe(edited.id, payload)
      : this.recipeService.createRecipe(payload);

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
      this.cdr.markForCheck();
    });
  }

  openShoppingListModal(recipe: RecipeMatchDto): void {
    this.recipeForShoppingList.set(recipe);
  }

  confirmAddMissingToShoppingList(recipe: RecipeMatchDto): void {
    alert(`Dodano ${recipe.missingIngredients.length} pozycji do Twojej listy zakupów!`);
    this.recipeForShoppingList.set(null);
  }

  toggleFavorite(recipeId: string): void {
    if (!recipeId) return;
    this.recipes.update(list => list.map(r => r.recipeId === recipeId ? { ...r, isFavorite: !r.isFavorite } : r));

    this.recipeService.toggleFavorite(recipeId).subscribe({
      error: () => {
        this.recipes.update(list => list.map(r => r.recipeId === recipeId ? { ...r, isFavorite: !r.isFavorite } : r));
        this.cdr.markForCheck();
      }
    });
  }

  openRecipeDetail(recipeId: string, summary?: RecipeMatchDto): void {
    if (!recipeId) return;

    this.detailSub?.unsubscribe();

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
        if (this.activeRecipeDetail() !== null) {
          this.activeRecipeDetail.set(detail);
          this.cdr.markForCheck();
        }
      },
      error: () => {
        this.detailSub = undefined;
      }
    });
  }

  onCloseRecipeDetail(): void {
    this.detailSub?.unsubscribe();
    this.detailSub = undefined;

    this.activeRecipeDetail.set(null);

    if (this.route.snapshot.queryParamMap.has('recipeId')) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { recipeId: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    }
  }
}
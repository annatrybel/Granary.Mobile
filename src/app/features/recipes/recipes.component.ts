import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { RecipeService } from '../../core/services/recipe.service';
import { RecipeMatchDto, RecipeDetailDto, RecipeTag, RecipeFilters } from './models/recipe.models';

import { RecipeSearchBarComponent } from './components/recipe-search-bar/recipe-search-bar.component';
import { RecipeTagsBarComponent } from './components/recipe-tags-bar/recipe-tags-bar.component';
import { RecipeFavoritesCarouselComponent } from './components/recipe-favorites-carousel/recipe-favorites-carousel.component';
import { RecipeCardComponent } from './components/recipe-card/recipe-card.component';
import { RecipeDetailSheetComponent } from './components/recipe-detail-sheet/recipe-detail-sheet.component';
import { RecipeFilterSheetComponent } from './components/recipe-filter-sheet/recipe-filter-sheet.component';

@Component({
  selector: 'app-recipes',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    RecipeSearchBarComponent,
    RecipeTagsBarComponent,
    RecipeFavoritesCarouselComponent,
    RecipeCardComponent,
    RecipeDetailSheetComponent,
    RecipeFilterSheetComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recipes.component.html',
  styleUrl: './recipes.component.scss'
})
export class RecipesComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private recipeService = inject(RecipeService);
  private cdr = inject(ChangeDetectorRef);

  isLoading = signal<boolean>(true);
  errorMessage = signal<string | null>(null);

  selectedTag = signal<string>('all');
  searchQuery = signal<string>('');

  recipes = signal<RecipeMatchDto[]>([]);
  activeRecipeDetail = signal<RecipeDetailDto | null>(null);
  isFilterSheetOpen = signal<boolean>(false);

  activeFilters = signal<RecipeFilters>({
    availability: 'all',
    maxTime: null,
    sortBy: 'match',
    mealType: null,
    diet: null
  });

  readonly tags: RecipeTag[] = [
    { id: 'all', name: 'Wszystkie' },
    { id: 'ready', name: 'Do zrobienia teraz' },
    { id: 'zerowaste', name: 'Zero Waste' },
    { id: 'quick', name: 'Szybkie (≤ 20 min)' }
  ];

  favoriteRecipes = computed(() => {
    return this.recipes().filter(r => r.isFavorite);
  });

  filteredRecipes = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const tag = this.selectedTag();
    const f = this.activeFilters();

    let list = this.recipes().filter(recipe => {
      if (tag === 'ready' && !recipe.canBeCookedNow && recipe.matchPercentage !== 100) return false;
      if (tag === 'zerowaste' && recipe.expiringIngredientsSaved === 0 && recipe.matchPercentage < 50) return false;
      if (tag === 'quick' && (recipe.prepTimeMinutes || 0) > 20) return false;

      if (f.availability === 'ready' && !recipe.canBeCookedNow && recipe.matchPercentage !== 100) return false;
      if (f.availability === 'missing2' && (recipe.missingIngredients?.length ?? 0) > 2) return false;
      if (f.maxTime && (recipe.prepTimeMinutes || 0) > f.maxTime) return false;

      if (query) {
        const titleMatch = (recipe.title || '').toLowerCase().includes(query);
        const descMatch = (recipe.description || '').toLowerCase().includes(query);
        const summaryMatch = (recipe.usedIngredientsSummary || '').toLowerCase().includes(query);
        const missingMatch = recipe.missingIngredients?.some(m => (m.productName || '').toLowerCase().includes(query)) ?? false;
        if (!titleMatch && !descMatch && !summaryMatch && !missingMatch) return false;
      }

      return true;
    });

    if (f.sortBy === 'time') {
      list = [...list].sort((a, b) => (a.prepTimeMinutes || 0) - (b.prepTimeMinutes || 0));
    } else {
      list = [...list].sort((a, b) => b.matchPercentage - a.matchPercentage);
    }

    return list;
  });

  ngOnInit(): void {
    const itemsParam = this.route.snapshot.queryParamMap.get('items');
    const selectedItemIds = itemsParam ? itemsParam.split(',') : undefined;
    this.loadSuggestions(selectedItemIds);
  }

  loadSuggestions(itemIds?: string[]): void {
    this.isLoading.set(true);
    this.recipeService.getSuggestions(itemIds).subscribe({
      next: (dtos: RecipeMatchDto[]) => {
        this.recipes.set(dtos || []);
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage.set('Nie udało się pobrać przepisów.');
        this.isLoading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  toggleFavorite(recipeId: string): void {
    if (!recipeId) return;

    this.recipes.update(list =>
      list.map(r => r.recipeId === recipeId ? { ...r, isFavorite: !r.isFavorite } : r)
    );

    if (this.activeRecipeDetail()?.id === recipeId) {
      this.activeRecipeDetail.update(d => d ? { ...d, isFavorite: !d.isFavorite } : null);
    }

    this.cdr.markForCheck();

    this.recipeService.toggleFavorite(recipeId).subscribe({
      error: (err) => {
        console.error('Błąd synchronizacji ulubionego:', err);
        this.recipes.update(list =>
          list.map(r => r.recipeId === recipeId ? { ...r, isFavorite: !r.isFavorite } : r)
        );
        this.cdr.markForCheck();
      }
    });
  }

  isFavorite(recipeId: string): boolean {
    return !!this.recipes().find(r => r.recipeId === recipeId)?.isFavorite;
  }

  openRecipeDetail(recipeId: string, summary?: RecipeMatchDto): void {
    if (!recipeId) return;

    this.activeRecipeDetail.set({
      id: recipeId,
      title: summary?.title || 'Wczytywanie...',
      description: summary?.description || '',
      instructions: '',
      imageUrl: summary?.imageUrl,
      prepTimeMinutes: summary?.prepTimeMinutes || 15,
      servings: summary?.servings || 2,
      isFavorite: summary?.isFavorite ?? false,
      likesCount: 0,
      dislikesCount: 0,
      userVote: null,
      ingredients: []
    });

    this.cdr.markForCheck();

    this.recipeService.getById(recipeId).subscribe({
      next: (res: any) => {
        const detail: RecipeDetailDto = res?.data ?? res;
        this.activeRecipeDetail.set(detail);
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Błąd pobierania szczegółów:', err);
        this.cdr.markForCheck();
      }
    });
  }

  onAddCustomRecipe(): void {
    alert('Tworzenie własnego przepisu – wkrótce!');
  }

  addMissingToShoppingList(recipe: RecipeMatchDto): void {
    alert(`Dodano ${recipe.missingIngredients.length} brakujących pozycji do listy zakupów!`);
  }
}
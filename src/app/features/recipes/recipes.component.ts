import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { RecipeService } from '../../core/services/recipe.service';
import { RecipeMatchDto, RecipeDetailDto, RecipeTag, RecipeFilters } from './models/recipe.models';
import { RecipeDetailSheetComponent } from './components/recipe-detail-sheet/recipe-detail-sheet.component';
import { RecipeFilterSheetComponent } from './components/recipe-filter-sheet/recipe-filter-sheet.component';

@Component({
  selector: 'app-recipes',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RecipeDetailSheetComponent, RecipeFilterSheetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recipes.component.html',
  styleUrl: './recipes.component.scss'
})
export class RecipesComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private recipeService = inject(RecipeService);

  isLoading = signal<boolean>(true);
  errorMessage = signal<string | null>(null);

  selectedTag = signal<string>('all');
  searchQuery = signal<string>('');

  recipes = signal<RecipeMatchDto[]>([]);
  activeRecipeDetail = signal<RecipeDetailDto | null>(null);

  private readonly favStorageKey = 'granary_fav_recipes';
  favoriteIds = signal<Set<string>>(new Set());

  isFilterSheetOpen = signal<boolean>(false);
  activeFilters = signal<RecipeFilters>({
    availability: 'all',
    maxTime: null,
    sortBy: 'match',
    mealType: null,
    diet: null
  });

  tags: RecipeTag[] = [
    { id: 'all', name: 'Wszystkie' },
    { id: 'ready', name: 'Do zrobienia teraz' },
    { id: 'zerowaste', name: 'Zero Waste' },
    { id: 'quick', name: 'Szybkie (≤ 20 min)' }
  ];

  favoriteRecipes = computed(() => {
    const favs = this.favoriteIds();
    return this.recipes().filter(r => favs.has(r.recipeId));
  });

  // Filtrowana lista główna
  filteredRecipes = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const tag = this.selectedTag();
    const f = this.activeFilters();

    let list = this.recipes().filter(recipe => {
      // 1. Filtr z szybkiego paska tagów
      if (tag === 'ready' && !recipe.canBeCookedNow && recipe.matchPercentage !== 100) return false;
      if (tag === 'zerowaste' && recipe.expiringIngredientsSaved === 0 && recipe.matchPercentage < 50) return false;
      if (tag === 'quick' && (recipe.prepTimeMinutes || 0) > 20) return false;

      // 2. Zaawansowane filtry z arkusza
      if (f.availability === 'ready' && !recipe.canBeCookedNow && recipe.matchPercentage !== 100) return false;
      if (f.availability === 'missing2' && (recipe.missingIngredients?.length ?? 0) > 2) return false;
      if (f.maxTime && (recipe.prepTimeMinutes || 0) > f.maxTime) return false;

      // 3. Wyszukiwanie po tekście i składnikach
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
    const savedFavs = localStorage.getItem(this.favStorageKey);
    if (savedFavs) {
      try {
        this.favoriteIds.set(new Set(JSON.parse(savedFavs)));
      } catch {}
    }

    const itemsParam = this.route.snapshot.queryParamMap.get('items');
    const selectedItemIds = itemsParam ? itemsParam.split(',') : undefined;
    this.loadSuggestions(selectedItemIds);
  }

  loadSuggestions(itemIds?: string[]): void {
    this.isLoading.set(true);
    this.recipeService.getSuggestions(itemIds).subscribe({
      next: (dtos) => {
        this.recipes.set(dtos || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Nie udało się pobrać przepisów.');
        this.isLoading.set(false);
      }
    });
  }

  toggleFavorite(recipeId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    this.favoriteIds.update(set => {
      const copy = new Set(set);
      if (copy.has(recipeId)) {
        copy.delete(recipeId);
      } else {
        copy.add(recipeId);
      }
      localStorage.setItem(this.favStorageKey, JSON.stringify(Array.from(copy)));
      return copy;
    });
  }

  isFavorite(recipeId: string): boolean {
    return this.favoriteIds().has(recipeId);
  }

  onAddCustomRecipe(): void {
    alert('Tworzenie własnego przepisu – wkrótce dostępne!');
  }

  openFilterSheet(): void {
    this.isFilterSheetOpen.set(true);
  }

  closeFilterSheet(): void {
    this.isFilterSheetOpen.set(false);
  }

  onApplyFilters(newFilters: RecipeFilters): void {
    this.activeFilters.set(newFilters);
  }

  onResetFilters(): void {
    this.activeFilters.set({
      availability: 'all',
      maxTime: null,
      sortBy: 'match',
      mealType: null,
      diet: null
    });
  }

  openRecipeDetail(recipeId: string, summary?: RecipeMatchDto): void {
    if (!recipeId) return;

    this.activeRecipeDetail.set({
      id: recipeId,
      title: summary?.title ?? 'Wczytywanie...',
      description: summary?.description ?? '',
      instructions: '',
      imageUrl: summary?.imageUrl,
      prepTimeMinutes: summary?.prepTimeMinutes ?? 15,
      servings: summary?.servings ?? 2,
      ingredients: []
    });

    this.recipeService.getById(recipeId).subscribe({
      next: (detail) => this.activeRecipeDetail.set(detail),
      error: (err) => console.error('Błąd pobierania szczegółów:', err)
    });
  }

  closeRecipeDetail(): void {
    this.activeRecipeDetail.set(null);
  }

  selectTag(tagId: string): void {
    this.selectedTag.set(tagId);
  }

  onSearchInput(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  addMissingToShoppingList(recipe: RecipeMatchDto, event: Event): void {
    event.stopPropagation();
    alert(`Dodano ${recipe.missingIngredients.length} brakujących pozycji do listy zakupów!`);
  }
}
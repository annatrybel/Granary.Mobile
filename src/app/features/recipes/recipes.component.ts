import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { RecipeService } from '../../core/services/recipe.service';
import { RecipeMatchDto, RecipeDetailDto, RecipeIngredientDto, RecipeTag, RecipeFilters, CreateCustomRecipePayload } from './models/recipe.models';

import { RecipeSearchBarComponent } from './components/recipe-search-bar/recipe-search-bar.component';
import { RecipeTagsBarComponent } from './components/recipe-tags-bar/recipe-tags-bar.component';
import { RecipeFavoritesCarouselComponent } from './components/recipe-favorites-carousel/recipe-favorites-carousel.component';
import { RecipeCardComponent } from './components/recipe-card/recipe-card.component';
import { RecipeDetailSheetComponent } from './components/recipe-detail-sheet/recipe-detail-sheet.component';
import { RecipeFilterSheetComponent } from './components/recipe-filter-sheet/recipe-filter-sheet.component';
import { AddRecipeSheetComponent } from './components/add-recipe-sheet/add-recipe-sheet.component';
import { RecipeFavoritesSheetComponent } from './components/recipe-favorites-sheet/recipe-favorites-sheet.component';


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
    RecipeFilterSheetComponent,
    AddRecipeSheetComponent,
    RecipeFavoritesSheetComponent
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
  isAddRecipeOpen = signal<boolean>(false);
  isFavoritesSheetOpen = signal<boolean>(false);

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

    // 1. Wstępny stan (0 ms opóźnienia)
    this.activeRecipeDetail.set({
      id: recipeId,
      title: summary?.title || 'Wczytywanie...',
      description: '',
      instructions: '',
      imageUrl: summary?.imageUrl,
      prepTimeMinutes: summary?.prepTimeMinutes || 15,
      servings: summary?.servings || 2,
      calories: (summary as any)?.calories ?? (summary as any)?.caloriesKcal ?? null,
      isFavorite: summary?.isFavorite ?? false,
      likesCount: 0,
      dislikesCount: 0,
      userVote: null,
      ingredients: []
    });

    this.recipeService.getById(recipeId).subscribe({
      next: (res: any) => {
        const raw = res?.data ?? res?.result ?? res?.value ?? res;
        if (!raw) return;

        const rawIngredients = raw.ingredients ?? raw.Ingredients ?? [];

        this.activeRecipeDetail.set({
          id: raw.id ?? raw.Id ?? recipeId,
          title: raw.title ?? raw.Title ?? summary?.title ?? '',
          description: '',
          instructions: raw.instructions ?? raw.Instructions ?? '',
          imageUrl: raw.imageUrl ?? raw.ImageUrl ?? summary?.imageUrl,
          prepTimeMinutes: raw.prepTimeMinutes ?? raw.PrepTimeMinutes ?? summary?.prepTimeMinutes ?? 15,
          servings: raw.servings ?? raw.Servings ?? summary?.servings ?? 2,
          calories: raw.calories ?? raw.Calories ?? raw.caloriesKcal ?? (summary as any)?.calories ?? null,
          isFavorite: raw.isFavorite ?? raw.IsFavorite ?? summary?.isFavorite ?? false,
          likesCount: raw.likesCount ?? raw.LikesCount ?? 0,
          dislikesCount: raw.dislikesCount ?? raw.DislikesCount ?? 0,
          userVote: raw.userVote ?? raw.UserVote ?? null,
          ingredients: Array.isArray(rawIngredients)
            ? rawIngredients.map((i: any) => ({
              productId: i.productId ?? i.ProductId ?? '',
              productName: i.productName ?? i.ProductName ?? i.name ?? 'Składnik',
              quantity: i.quantity ?? i.Quantity ?? 1,
              unit: i.unit ?? i.Unit ?? 'szt.',
              isOptional: !!(i.isOptional ?? i.IsOptional),
              isOwnedInPantry: !!(i.isOwnedInPantry ?? i.IsOwnedInPantry)
            }))
            : []
        });

        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Błąd pobierania szczegółów przepisu:', err);
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

  onOpenAddRecipe(): void {
    this.isAddRecipeOpen.set(true);
  }

  onCloseAddRecipe(): void {
    this.isAddRecipeOpen.set(false);
  }

  onSaveCustomRecipe(payload: CreateCustomRecipePayload): void {
    const tempId = 'custom-' + Date.now();

    const newRecipe: RecipeMatchDto = {
      recipeId: tempId,
      title: payload.title,
      description: `Kategoria: ${payload.category}`,
      imageUrl: payload.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
      prepTimeMinutes: payload.prepTimeMinutes,
      servings: payload.servings,
      matchPercentage: 100,
      ownedIngredientsCount: payload.ingredients.length,
      totalIngredientsCount: payload.ingredients.length,
      expiringIngredientsSaved: 0,
      canBeCookedNow: true,
      isFavorite: true, 
      usedIngredientsSummary: `Składniki: ${payload.ingredients.map(i => i.name).join(', ')}`,
      missingIngredients: []
    };

    this.recipes.update(list => [newRecipe, ...list]);
    this.isAddRecipeOpen.set(false);
    this.cdr.markForCheck();

    this.recipeService.createRecipe(payload).subscribe({
      next: (createdRecipe: any) => {
        const serverId = createdRecipe?.id || createdRecipe?.recipeId || createdRecipe?.data?.id;
        if (serverId) {
          this.recipes.update(list =>
            list.map(r => r.recipeId === tempId ? { ...r, recipeId: serverId } : r)
          );
        }
      },
      error: (err) => {
        console.error('Błąd zapisu przepisu na backendzie:', err);
      }
    });
  }

  onOpenAddRecipeFromFavorites(): void {
    this.isFavoritesSheetOpen.set(false);
    this.isAddRecipeOpen.set(true);
  }
}
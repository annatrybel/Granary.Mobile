import { Component, input, output, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { RecipeMatchDto } from '../../models/recipe.models';
import { RecipeCardComponent } from '../recipe-card/recipe-card.component';

@Component({
  selector: 'app-recipe-favorites-sheet',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RecipeCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recipe-favorites-sheet.component.html',
  styleUrl: './recipe-favorites-sheet.component.scss'
})
export class RecipeFavoritesSheetComponent {
  favorites = input.required<RecipeMatchDto[]>();

  closeSheet = output<void>();
  recipeClick = output<RecipeMatchDto>();
  toggleFav = output<string>();
  addMissing = output<RecipeMatchDto>();
  addCustom = output<void>();

  searchQuery = signal<string>('');

  filteredFavorites = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const list = this.favorites();
    if (!query) return list;

    return list.filter(r => 
      (r.title || '').toLowerCase().includes(query) ||
      (r.description || '').toLowerCase().includes(query) ||
      (r.usedIngredientsSummary || '').toLowerCase().includes(query)
    );
  });
}
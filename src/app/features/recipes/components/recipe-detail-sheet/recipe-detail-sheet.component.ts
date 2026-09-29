import { Component, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { RecipeDetailDto } from '../../models/recipe.models';

@Component({
  selector: 'app-recipe-detail-sheet',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recipe-detail-sheet.component.html',
  styleUrl: './recipe-detail-sheet.component.scss'
})
export class RecipeDetailSheetComponent {
  recipe = input.required<RecipeDetailDto>();
  
  isFavorite = input<boolean>(false);

  closeSheet = output<void>();
  toggleFavorite = output<void>(); 

  selectedRating = signal<number>(5);

  get instructionSteps(): string[] {
    const raw = this.recipe().instructions || '';
    if (!raw) return [];
    return raw
      .split('\n')
      .map(s => s.replace(/^\d+[\.\)]\s*/, '').trim())
      .filter(s => s.length > 0);
  }

  setRating(stars: number): void {
    this.selectedRating.set(stars);
  }

  onFavoriteClick(event: Event): void {
    event.stopPropagation();
    this.toggleFavorite.emit();
  }

  cookRecipe(): void {
    alert('Ugotowano przepis! Składniki zostaną odliczone z magazynu.');
    this.closeSheet.emit();
  }
}
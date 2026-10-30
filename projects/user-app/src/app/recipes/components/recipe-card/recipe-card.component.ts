import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RecipeMatchDto, APP_ICONS } from '@granary/shared';
import { TranslatePipe } from '@granary/shared';
import { MediaUrlPipe } from '@granary/shared';


@Component({
  selector: 'app-recipe-card',
  standalone: true,
  imports: [CommonModule, TranslatePipe, MediaUrlPipe, APP_ICONS],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recipe-card.component.html'
})
export class RecipeCardComponent {
  recipe = input.required<RecipeMatchDto>();
  isFavorite = input<boolean>(false);

  cardClick = output<void>();
  toggleFav = output<string>();
  addMissing = output<void>();
  editRecipe = output<RecipeMatchDto>();
  deleteRecipe = output<RecipeMatchDto>();

  onHeartClick(id: string, event: Event): void {
    event.stopPropagation();
    this.toggleFav.emit(id);
  }

  onEditClick(r: RecipeMatchDto, event: Event): void {
    event.stopPropagation();
    this.editRecipe.emit(r);
  }

  onDeleteClick(r: RecipeMatchDto, event: Event): void {
    event.stopPropagation();
    this.deleteRecipe.emit(r);
  }

  onAddMissingClick(event: Event): void {
    event.stopPropagation();
    this.addMissing.emit();
  }
}
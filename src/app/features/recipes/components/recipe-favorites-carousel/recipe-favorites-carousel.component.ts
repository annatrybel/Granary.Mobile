import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { RecipeMatchDto } from '../../models/recipe.models';

@Component({
  selector: 'app-recipe-favorites-carousel',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recipe-favorites-carousel.component.html',
  styleUrl: './recipe-favorites-carousel.component.scss'
})
export class RecipeFavoritesCarouselComponent {
  favorites = input.required<RecipeMatchDto[]>();

  addCustom = output<void>();
  seeAll = output<void>();
  recipeClick = output<string>();
  toggleFav = output<string>();

  readonly fallbackSvg = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='163' height='204' fill='%23F3F4F6' viewBox='0 0 24 24'><rect width='24' height='24' rx='2' fill='%23F3F4F6'/></svg>";

  onHeartClick(id: string, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.toggleFav.emit(id);
  }

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.onerror = null;
    img.src = this.fallbackSvg;
  }
}
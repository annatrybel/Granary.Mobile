import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { RecipeMatchDto } from '../../models/recipe.models';

@Component({
  selector: 'app-recipe-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recipe-card.component.html',
  styleUrl: './recipe-card.component.scss'
})
export class RecipeCardComponent {
  recipe = input.required<RecipeMatchDto>();
  isFavorite = input<boolean>(false);

  cardClick = output<void>();
  toggleFav = output<string>();
  addMissing = output<void>();

  readonly fallbackSvg = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='300' fill='%23F3F4F6' viewBox='0 0 24 24'><rect width='24' height='24' rx='2' fill='%23F3F4F6'/><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z' fill='%239CA3AF'/></svg>";

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
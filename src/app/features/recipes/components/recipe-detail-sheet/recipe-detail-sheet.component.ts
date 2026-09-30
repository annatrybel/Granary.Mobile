import { Component, input, output, signal, computed, effect, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { RecipeDetailDto } from '../../models/recipe.models';
import { RecipeService } from '../../../../core/services/recipe.service';

@Component({
  selector: 'app-recipe-detail-sheet',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recipe-detail-sheet.component.html',
  styleUrl: './recipe-detail-sheet.component.scss'
})
export class RecipeDetailSheetComponent {
  private recipeService = inject(RecipeService);

  recipe = input.required<RecipeDetailDto>();
  isFavorite = input<boolean>(false);

  closeSheet = output<void>();
  toggleFavorite = output<void>();

  likesCount = signal<number>(0);
  dislikesCount = signal<number>(0);
  userVote = signal<boolean | null>(null);

  readonly fallbackSvg = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='300' fill='%23F3F4F6' viewBox='0 0 24 24'><rect width='24' height='24' rx='2' fill='%23F3F4F6'/><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z' fill='%239CA3AF'/></svg>";

  instructionSteps = computed(() => {
    const raw = this.recipe()?.instructions || '';
    if (!raw) return [];
    return raw
      .split('\n')
      .map(s => s.replace(/^\d+[\.\)]\s*/, '').trim())
      .filter(s => s.length > 0);
  });

  constructor() {
    effect(() => {
      const r = this.recipe();
      if (r) {
        this.likesCount.set(r.likesCount || 0);
        this.dislikesCount.set(r.dislikesCount || 0);
        this.userVote.set(r.userVote ?? null);
      }
    }, { allowSignalWrites: true });
  }

  onVote(isLike: boolean): void {
    const current = this.userVote();
    const recipeId = this.recipe().id;

    if (current === isLike) {
      this.userVote.set(null);
      if (isLike) this.likesCount.update(c => Math.max(0, c - 1));
      else this.dislikesCount.update(c => Math.max(0, c - 1));
    } else {
      if (current === true) this.likesCount.update(c => Math.max(0, c - 1));
      if (current === false) this.dislikesCount.update(c => Math.max(0, c - 1));

      this.userVote.set(isLike);
      if (isLike) this.likesCount.update(c => c + 1);
      else this.dislikesCount.update(c => c + 1);
    }

    this.recipeService.voteRecipe(recipeId, isLike).subscribe({
      next: (res: any) => {
        const result = res?.data ?? res;
        if (result) {
          this.likesCount.set(result.likesCount);
          this.dislikesCount.set(result.dislikesCount);
          this.userVote.set(result.userVote);
        }
      },
      error: () => this.userVote.set(current)
    });
  }

  onFavoriteClick(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.toggleFavorite.emit();
  }

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.onerror = null;
    img.src = this.fallbackSvg;
  }

  cookRecipe(): void {
    alert('Ugotowano przepis! Składniki zostaną odliczone z magazynu.');
    this.closeSheet.emit();
  }
}
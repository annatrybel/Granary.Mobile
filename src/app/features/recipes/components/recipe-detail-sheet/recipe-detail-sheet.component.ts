import { 
  Component, 
  input, 
  output, 
  signal, 
  computed, 
  inject, 
  ChangeDetectionStrategy, 
  ChangeDetectorRef 
} from '@angular/core';
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
  private readonly recipeService = inject(RecipeService);
  private readonly cdr = inject(ChangeDetectorRef);

  recipe = input.required<RecipeDetailDto>();
  isFavorite = input<boolean>(false);

  closeSheet = output<void>();
  toggleFavorite = output<void>();

  userVoteOverride = signal<boolean | null | undefined>(undefined);
  likesCountDelta = signal<number>(0);

  readonly fallbackSvg = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='300' fill='%23F3F4F6' viewBox='0 0 24 24'><rect width='24' height='24' rx='2' fill='%23F3F4F6'/><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z' fill='%239CA3AF'/></svg>";

  isLiked = computed(() => {
    const override = this.userVoteOverride();
    return override !== undefined ? override === true : (this.recipe()?.userVote === true);
  });

  likesCount = computed(() => {
    const base = this.recipe()?.likesCount || 0;
    return Math.max(0, base + this.likesCountDelta());
  });

  caloriesCount = computed(() => {
    const r = this.recipe() as any;
    return r?.calories ?? r?.caloriesKcal ?? r?.kcal ?? null;
  });

  instructionSteps = computed(() => {
    const raw = (this.recipe()?.instructions || '').trim();
    if (!raw) return [];

    let lines = raw.split(/\r?\n/).map(s => s.trim()).filter(s => s.length > 0);

    if (lines.length === 1 && /\d+[\.\)]\s+/.test(lines[0])) {
      lines = lines[0].split(/(?=\d+[\.\)]\s+)/).map(s => s.trim()).filter(s => s.length > 0);
    }

    return lines.map(s => s.replace(/^\d+[\.\)]\s*/, '').trim());
  });

  toggleLike(): void {
    const r = this.recipe();
    if (!r) return;

    const previouslyLiked = this.isLiked();
    const newLiked = !previouslyLiked;
    const delta = newLiked ? 1 : -1;

    this.userVoteOverride.set(newLiked ? true : null);
    this.likesCountDelta.update(d => d + delta);

    this.recipeService.voteRecipe(r.id, true).subscribe({
      next: (res: any) => {
        const result = res?.data ?? res?.result ?? res;
        if (result && typeof result.likesCount === 'number') {
          r.likesCount = result.likesCount;
          r.userVote = result.userVote;
          this.userVoteOverride.set(undefined);
          this.likesCountDelta.set(0);
          this.cdr.markForCheck();
        }
      },
      error: () => {
        this.userVoteOverride.set(previouslyLiked ? true : null);
        this.likesCountDelta.update(d => d - delta);
        this.cdr.markForCheck();
      }
    });
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
import {
  Component,
  input,
  output,
  signal,
  inject,
  OnInit,
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RecipeService } from '../../../core/services/recipe.service';
import { CreateCustomRecipePayload, RecipeDetailDto, APP_ICONS } from '@granary/shared';

import { CatalogProductDto } from '@granary/shared';
import { CatalogSearchBarComponent } from '../../../shared/components/catalog-search-bar/catalog-search-bar.component';
import { ConfirmDeleteModalComponent } from '@granary/shared';

import { TranslatePipe } from '@granary/shared';
import { MediaUrlPipe } from '@granary/shared';


export interface FormIngredientItem {
  id: string;
  productId: string;
  name: string;
  amount: number;
  unit: string;
}

export interface FormStepItem {
  id: number;
  text: string;
}

@Component({
  selector: 'app-add-recipe-sheet',
  standalone: true,
  imports: [
    CommonModule,
    CatalogSearchBarComponent,
    ConfirmDeleteModalComponent,
    TranslatePipe,
    MediaUrlPipe,
    APP_ICONS,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './add-recipe-sheet.component.html',
  styleUrl: './add-recipe-sheet.component.scss'
})
export class AddRecipeSheetComponent implements OnInit, AfterViewInit {
  private readonly recipeService = inject(RecipeService);
  private readonly cdr = inject(ChangeDetectorRef);

  recipeToEdit = input<RecipeDetailDto | null>(null);
  isOpen = input<boolean>(true);
  closeSheet = output<void>();
  save = output<CreateCustomRecipePayload>();

  title = signal<string>('');
  servings = signal<number>(1);
  prepTimeMinutes = signal<number>(20);
  calories = signal<number | null>(null);
  selectedCategory = signal<string>('Obiad');
  imageUrl = signal<string | null>(null);
  isGeneratingImage = signal<boolean>(false);

  readonly categories = ['Obiad', 'Śniadanie', 'Kolacja', 'Wypieki i ciasta', 'Przekąska'];
  readonly availableUnits = ['szt.', 'g', 'kg', 'ml', 'L', 'łyżka', 'szklanka', 'szczypta', 'op.'];

  ingredients = signal<FormIngredientItem[]>([]);
  ingredientToDelete = signal<FormIngredientItem | null>(null);

  private stepIdCounter = 2;
  steps = signal<FormStepItem[]>([
    { id: 1, text: '' }
  ]);

  ngOnInit(): void {
    const edit = this.recipeToEdit();
    if (edit) {
      this.title.set(edit.title || '');
      this.servings.set(edit.servings || 1);
      this.prepTimeMinutes.set(edit.prepTimeMinutes || 20);
      this.calories.set(edit.calories ?? null);
      this.imageUrl.set(edit.imageUrl || null);

      if (edit.ingredients && edit.ingredients.length > 0) {
        this.ingredients.set(edit.ingredients.map(i => ({
          id: 'ing_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          productId: i.productId,
          name: i.productName,
          amount: Number(i.quantity) || 1,
          unit: i.unit || 'szt.'
        })));
      }

      if (edit.instructions) {
        const splitSteps = edit.instructions
          .split(/\r?\n/)
          .map(s => s.replace(/^\d+[\.\)]\s*/, '').trim())
          .filter(s => s.length > 0);

        if (splitSteps.length > 0) {
          this.stepIdCounter = splitSteps.length + 1;
          this.steps.set(splitSteps.map((s, idx) => ({ id: idx + 1, text: s })));
        }
      }
    }
  }

  ngAfterViewInit(): void {
    this.cdr.detectChanges();
  }

  changeServings(delta: number): void {
    this.servings.update(s => Math.max(1, s + delta));
    this.cdr.markForCheck();
  }

  changeTime(delta: number): void {
    this.prepTimeMinutes.update(t => Math.max(5, t + delta));
    this.cdr.markForCheck();
  }

  onCaloriesInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const val = input.value.trim();
    if (!val) {
      this.calories.set(null);
      return;
    }
    const parsed = parseInt(val, 10);
    this.calories.set(!isNaN(parsed) && parsed >= 0 ? parsed : null);
  }

  onSelectCatalogProduct(prod: CatalogProductDto): void {
    const existing = this.ingredients().find(i => i.productId === prod.id);

    if (existing) {
      this.ingredients.update(list =>
        list.map(item => item.id === existing.id ? { ...item, amount: item.amount + 1 } : item)
      );
    } else {
      this.ingredients.update(list => [
        ...list,
        {
          id: 'ing_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          productId: prod.id,
          name: prod.name,
          amount: 1,
          unit: prod.defaultUnit || 'szt.'
        }
      ]);
    }
    this.cdr.markForCheck();
  }

  onCreateCustomProduct(name: string): void {
    const trimmed = name.trim();
    if (!trimmed) return;

    this.recipeService.createCatalogProduct(trimmed).subscribe({
      next: (createdProd: any) => {
        const prod = createdProd?.data ?? createdProd?.result ?? createdProd;
        this.ingredients.update(list => [
          ...list,
          {
            id: 'ing_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            productId: prod?.id || '',
            name: prod?.name || trimmed,
            amount: 1,
            unit: 'szt.'
          }
        ]);
        this.cdr.markForCheck();
      },
      error: () => {
        this.ingredients.update(list => [
          ...list,
          {
            id: 'ing_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            productId: '',
            name: trimmed,
            amount: 1,
            unit: 'szt.'
          }
        ]);
        this.cdr.markForCheck();
      }
    });
  }

  askDeleteIngredient(item: FormIngredientItem): void {
    this.ingredientToDelete.set(item);
    this.cdr.markForCheck();
  }

  confirmDeleteIngredient(): void {
    const target = this.ingredientToDelete();
    if (target) {
      this.ingredients.update(list => list.filter(i => i.id !== target.id));
      this.ingredientToDelete.set(null);
      this.cdr.markForCheck();
    }
  }

  cancelDeleteIngredient(): void {
    this.ingredientToDelete.set(null);
    this.cdr.markForCheck();
  }

  updateIngredientAmount(id: string, amount: number): void {
    this.ingredients.update(list =>
      list.map(item => item.id === id ? { ...item, amount: Math.max(0.1, amount) } : item)
    );
  }

  updateIngredientUnit(id: string, unit: string): void {
    this.ingredients.update(list =>
      list.map(item => item.id === id ? { ...item, unit } : item)
    );
  }

  addStep(): void {
    const newId = this.stepIdCounter++;
    this.steps.update(list => [...list, { id: newId, text: '' }]);
    this.cdr.markForCheck();
  }

  updateStep(id: number, text: string): void {
    this.steps.update(list =>
      list.map(s => s.id === id ? { ...s, text } : s)
    );
  }

  removeStep(id: number): void {
    if (this.steps().length <= 1) {
      this.steps.set([{ id: 1, text: '' }]);
      this.cdr.markForCheck();
      return;
    }
    this.steps.update(list => list.filter(s => s.id !== id));
    this.cdr.markForCheck();
  }

  onImageFileChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imageUrl.set(e.target?.result as string);
        this.cdr.markForCheck();
      };
      reader.readAsDataURL(file);
    }
  }

  generateAiImage(): void {
    const titleVal = this.title().trim();
    if (!titleVal) {
      alert('Wpisz najpierw nazwę dania!');
      return;
    }

    this.isGeneratingImage.set(true);

    this.recipeService.generateRecipeImage(titleVal).subscribe({
      next: (res: any) => {
        this.isGeneratingImage.set(false);
        if (res.success && res.imageUrl) {
          this.imageUrl.set(res.imageUrl);
        }
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.isGeneratingImage.set(false);
        const msg = err.error?.message || 'Nie udało się wygenerować zdjęcia (nazwa nie jest potrawą lub narusza zasady).';
        alert(msg);
        this.imageUrl.set('/icons/food-placeholder.svg');
        this.cdr.markForCheck();
      }
    });
  }

  onSubmit(): void {
    const titleVal = this.title().trim();
    if (!titleVal) return;

    const validIngredients = this.ingredients()
      .filter(i => i.name.trim().length > 0)
      .map(i => ({
        productId: i.productId || undefined,
        name: i.name.trim(),
        quantity: `${i.amount} ${i.unit}`
      }));

    const validSteps = this.steps()
      .map(s => s.text.trim())
      .filter(t => t.length > 0);

    this.save.emit({
      title: titleVal,
      category: this.selectedCategory(),
      servings: this.servings(),
      prepTimeMinutes: this.prepTimeMinutes(),
      calories: this.calories() ?? undefined,
      imageUrl: this.imageUrl() || undefined,
      ingredients: validIngredients,
      steps: validSteps
    });
  }
}
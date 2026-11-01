import { Component, ChangeDetectionStrategy, inject, input, output, signal, OnInit } from '@angular/core';
import { FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { APP_ICONS } from '@granary/shared';
import { AdminModalComponent } from '../../../shared/components/admin-modal/admin-modal.component';
import { AdminImagePickerComponent } from '../../../shared/components/admin-image-picker/admin-image-picker.component';
import { AdminProductPickerComponent } from '../../../shared/components/admin-product-picker/admin-product-picker.component';
import { CatalogProductDto } from '../../../products/services/admin-products.service';
import { extractApiError } from '../../../shared/utils/api-error';
import { AdminRecipeEdit, AdminRecipeIngredient, AdminRecipesService } from '../../services/admin-recipes.service';

const UNIT_SUGGESTIONS = ['szt.', 'g', 'kg', 'ml', 'l', 'łyżka', 'łyżeczka', 'szklanka', 'szczypta', 'op.'];

type IngredientGroup = FormGroup<{
  productId: FormControl<string>;
  productName: FormControl<string>;
  quantity: FormControl<number>;
  unit: FormControl<string>;
  isOptional: FormControl<boolean>;
}>;

@Component({
  selector: 'app-recipe-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule, AdminModalComponent, AdminImagePickerComponent, AdminProductPickerComponent, APP_ICONS],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-admin-modal
      [title]="isEdit() ? 'Edytuj przepis' : 'Dodaj nowy przepis'"
      [subtitle]="isEdit() ? form.controls.title.value : 'Przepis zostanie dodany do oficjalnego katalogu.'"
      [maxWidth]="760"
      (close)="cancel.emit()">

      @if (isLoading()) {
        <div class="py-10 text-center text-xs font-bold text-[#536500]">Ładowanie przepisu…</div>
      } @else if (loadError()) {
        <div class="flex flex-col gap-4">
          <div class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">{{ loadError() }}</div>
          <div class="flex justify-end">
            <button type="button" (click)="cancel.emit()"
              class="h-10 px-4 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-700 font-bold text-xs cursor-pointer">
              Zamknij
            </button>
          </div>
        </div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-5" novalidate>

          <div class="flex flex-col gap-1.5">
            <label for="recipe-title" class="text-xs font-bold text-neutral-700">Nazwa przepisu</label>
            <input id="recipe-title" type="text" formControlName="title" autocomplete="off"
                   class="h-11 px-3.5 rounded-xl border bg-neutral-50 text-sm outline-none focus:bg-white focus:border-[#536500]"
                   [class.border-rose-400]="isInvalid(form.controls.title)"
                   [class.border-neutral-200]="!isInvalid(form.controls.title)" />
            @if (isInvalid(form.controls.title)) {
              <span class="text-[11px] font-semibold text-rose-600">Nazwa jest wymagana (maks. 200 znaków).</span>
            }
          </div>

          <app-admin-image-picker
            label="Zdjęcie dania"
            kind="recipe"
            [prompt]="form.controls.title.value"
            [value]="imageUrl()"
            (valueChange)="imageUrl.set($event)" />

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="flex flex-col gap-1.5">
              <label for="recipe-servings" class="text-xs font-bold text-neutral-700">Porcje</label>
              <input id="recipe-servings" type="number" formControlName="servings" min="1" max="100"
                     class="h-11 px-3.5 rounded-xl border bg-neutral-50 text-sm outline-none focus:bg-white focus:border-[#536500]"
                     [class.border-rose-400]="isInvalid(form.controls.servings)"
                     [class.border-neutral-200]="!isInvalid(form.controls.servings)" />
              @if (isInvalid(form.controls.servings)) {
                <span class="text-[11px] font-semibold text-rose-600">Od 1 do 100.</span>
              }
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="recipe-time" class="text-xs font-bold text-neutral-700">Czas przygotowania (min)</label>
              <input id="recipe-time" type="number" formControlName="prepTimeMinutes" min="1" max="1440"
                     class="h-11 px-3.5 rounded-xl border bg-neutral-50 text-sm outline-none focus:bg-white focus:border-[#536500]"
                     [class.border-rose-400]="isInvalid(form.controls.prepTimeMinutes)"
                     [class.border-neutral-200]="!isInvalid(form.controls.prepTimeMinutes)" />
              @if (isInvalid(form.controls.prepTimeMinutes)) {
                <span class="text-[11px] font-semibold text-rose-600">Od 1 do 1440.</span>
              }
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="recipe-calories" class="text-xs font-bold text-neutral-700">Kalorie (kcal)</label>
              <input id="recipe-calories" type="number" formControlName="calories" min="0" max="10000"
                     class="h-11 px-3.5 rounded-xl border bg-neutral-50 text-sm outline-none focus:bg-white focus:border-[#536500]"
                     [class.border-rose-400]="isInvalid(form.controls.calories)"
                     [class.border-neutral-200]="!isInvalid(form.controls.calories)" />
              @if (isInvalid(form.controls.calories)) {
                <span class="text-[11px] font-semibold text-rose-600">Od 0 do 10000.</span>
              }
            </div>
          </div>

          <section class="flex flex-col gap-2.5">
            <h3 class="text-xs font-extrabold text-neutral-700 uppercase tracking-wider m-0">Składniki</h3>

            <app-admin-product-picker (selected)="addIngredient($event)" />

            @if (ingredientNotice()) {
              <span class="text-[11px] font-semibold text-amber-700">{{ ingredientNotice() }}</span>
            }

            <datalist id="recipe-units">
              @for (unit of units; track unit) { <option [value]="unit"></option> }
            </datalist>

            <ul class="flex flex-col gap-2 list-none p-0 m-0">
              @for (group of ingredients.controls; track group.controls.productId.value; let i = $index) {
                <li [formGroup]="group" class="flex flex-wrap sm:flex-nowrap items-center gap-2 p-2.5 rounded-xl border border-neutral-200 bg-neutral-50/60">
                  <span class="flex-1 min-w-[140px] text-xs font-bold text-neutral-900 truncate">{{ group.controls.productName.value }}</span>

                  <input type="number" formControlName="quantity" min="0.01" step="any" aria-label="Ilość"
                         class="w-20 h-9 px-2.5 rounded-lg border bg-white text-xs outline-none focus:border-[#536500]"
                         [class.border-rose-400]="isInvalid(group.controls.quantity)"
                         [class.border-neutral-200]="!isInvalid(group.controls.quantity)" />

                  <input type="text" formControlName="unit" list="recipe-units" aria-label="Jednostka" maxlength="20"
                         class="w-24 h-9 px-2.5 rounded-lg border bg-white text-xs outline-none focus:border-[#536500]"
                         [class.border-rose-400]="isInvalid(group.controls.unit)"
                         [class.border-neutral-200]="!isInvalid(group.controls.unit)" />

                  <label class="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-500 cursor-pointer select-none">
                    <input type="checkbox" formControlName="isOptional" class="accent-[#536500]" />
                    opcjonalny
                  </label>

                  <button type="button" (click)="removeIngredient(i)" title="Usuń składnik"
                          class="w-8 h-8 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 inline-flex items-center justify-center cursor-pointer border-none bg-transparent">
                    <svg lucideTrash [size]="15"></svg>
                  </button>
                </li>
              } @empty {
                <li class="text-xs text-neutral-400 py-2">Brak składników – wyszukaj produkt powyżej, aby dodać pierwszy.</li>
              }
            </ul>
          </section>

          <section class="flex flex-col gap-2.5">
            <div class="flex items-center justify-between">
              <h3 class="text-xs font-extrabold text-neutral-700 uppercase tracking-wider m-0">Kroki przygotowania</h3>
              <button type="button" (click)="addStep()"
                      class="h-8 px-3 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-700 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer">
                <svg lucidePlus [size]="14"></svg>
                <span>Dodaj krok</span>
              </button>
            </div>

            <ol class="flex flex-col gap-2 list-none p-0 m-0">
              @for (step of steps.controls; track step; let i = $index) {
                <li class="flex items-start gap-2.5">
                  <span class="w-7 h-7 mt-1.5 shrink-0 rounded-full bg-[#536500]/10 text-[#536500] text-xs font-extrabold flex items-center justify-center">{{ i + 1 }}</span>
                  <textarea [formControl]="step" rows="2" [attr.aria-label]="'Krok ' + (i + 1)"
                            class="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm outline-none focus:bg-white focus:border-[#536500] resize-y"></textarea>
                  <button type="button" (click)="removeStep(i)" title="Usuń krok"
                          class="w-8 h-8 mt-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 inline-flex items-center justify-center cursor-pointer border-none bg-transparent">
                    <svg lucideTrash [size]="15"></svg>
                  </button>
                </li>
              }
            </ol>
          </section>

          @if (errorMessage()) {
            <div class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {{ errorMessage() }}
            </div>
          }

          <div class="flex justify-end gap-2.5 pt-1">
            <button type="button" (click)="cancel.emit()" [disabled]="isSaving()"
                    class="h-10 px-4 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-700 font-bold text-xs cursor-pointer disabled:opacity-50">
              Anuluj
            </button>
            <button type="submit" [disabled]="isSaving()"
                    class="h-10 px-5 rounded-xl bg-[#536500] hover:bg-[#435200] text-white font-bold text-xs shadow-md shadow-[#536500]/20 cursor-pointer disabled:opacity-60">
              {{ isSaving() ? 'Zapisywanie…' : (isEdit() ? 'Zapisz zmiany' : 'Dodaj przepis') }}
            </button>
          </div>
        </form>
      }
    </app-admin-modal>
  `
})
export class RecipeFormModalComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly recipesService = inject(AdminRecipesService);

  /** Id przepisu do edycji; `null` oznacza tryb dodawania. */
  readonly recipeId = input<string | null>(null);

  readonly saved = output<void>();
  readonly cancel = output<void>();

  readonly units = UNIT_SUGGESTIONS;

  readonly isLoading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly isSaving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly ingredientNotice = signal<string | null>(null);
  readonly imageUrl = signal<string | null>(null);

  readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    servings: [1, [Validators.required, Validators.min(1), Validators.max(100)]],
    prepTimeMinutes: [15, [Validators.required, Validators.min(1), Validators.max(1440)]],
    calories: this.fb.control<number | null>(null, [Validators.min(0), Validators.max(10000)]),
    steps: this.fb.array<FormControl<string>>([]),
    ingredients: this.fb.array<IngredientGroup>([])
  });

  get steps() { return this.form.controls.steps; }
  get ingredients() { return this.form.controls.ingredients; }

  isEdit = () => this.recipeId() !== null;

  ngOnInit(): void {
    const id = this.recipeId();

    if (id === null) {
      this.addStep();
      return;
    }

    this.isLoading.set(true);
    this.recipesService.getRecipeForEdit(id).subscribe({
      next: (recipe) => {
        this.populate(recipe);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.loadError.set(extractApiError(err, 'Nie udało się pobrać przepisu.'));
        this.isLoading.set(false);
      }
    });
  }

  isInvalid(control: { invalid: boolean; touched: boolean; dirty: boolean }): boolean {
    return control.invalid && (control.touched || control.dirty);
  }

  addIngredient(product: CatalogProductDto): void {
    if (this.ingredients.controls.some(g => g.controls.productId.value === product.id)) {
      this.ingredientNotice.set(`„${product.name}” jest już na liście składników.`);
      return;
    }

    this.ingredientNotice.set(null);
    this.ingredients.push(this.createIngredient({
      productId: product.id,
      productName: product.name,
      quantity: 1,
      unit: product.defaultUnit || 'szt.',
      isOptional: false
    }));
  }

  removeIngredient(index: number): void {
    this.ingredientNotice.set(null);
    this.ingredients.removeAt(index);
  }

  addStep(): void {
    this.steps.push(this.createStep(''));
  }

  removeStep(index: number): void {
    this.steps.removeAt(index);
  }

  submit(): void {
    const filledSteps = this.steps.value.map(s => s.trim()).filter(s => s.length > 0);

    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    if (this.ingredients.length === 0) {
      this.errorMessage.set('Dodaj co najmniej jeden składnik.');
      return;
    }

    if (filledSteps.length === 0) {
      this.errorMessage.set('Dodaj co najmniej jeden krok przygotowania.');
      return;
    }

    const raw = this.form.getRawValue();

    this.isSaving.set(true);
    this.errorMessage.set(null);

    const payload = {
      title: raw.title.trim(),
      imageUrl: this.imageUrl(),
      servings: raw.servings,
      prepTimeMinutes: raw.prepTimeMinutes,
      calories: raw.calories,
      steps: filledSteps,
      ingredients: raw.ingredients.map(i => ({ ...i, unit: i.unit.trim() }))
    };

    const id = this.recipeId();
    const request$ = id === null
      ? this.recipesService.createRecipe(payload)
      : this.recipesService.updateRecipe(id, payload);

    request$.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.saved.emit();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.errorMessage.set(extractApiError(err, 'Nie udało się zapisać przepisu.'));
      }
    });
  }

  private populate(recipe: AdminRecipeEdit): void {
    this.form.patchValue({
      title: recipe.title,
      servings: recipe.servings,
      prepTimeMinutes: recipe.prepTimeMinutes,
      calories: recipe.calories
    });
    this.imageUrl.set(recipe.imageUrl);

    recipe.steps.forEach(step => this.steps.push(this.createStep(step)));
    recipe.ingredients.forEach(ingredient => this.ingredients.push(this.createIngredient(ingredient)));
  }

  private createStep(text: string): FormControl<string> {
    return this.fb.control(text);
  }

  private createIngredient(value: AdminRecipeIngredient): IngredientGroup {
    return this.fb.group({
      productId: [value.productId],
      productName: [value.productName],
      quantity: [value.quantity, [Validators.required, Validators.min(0.01)]],
      unit: [value.unit, [Validators.required, Validators.maxLength(20)]],
      isOptional: [value.isOptional]
    });
  }
}

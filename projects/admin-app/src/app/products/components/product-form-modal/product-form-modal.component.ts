import { Component, ChangeDetectionStrategy, inject, input, output, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminModalComponent } from '../../../shared/components/admin-modal/admin-modal.component';
import { AdminImagePickerComponent } from '../../../shared/components/admin-image-picker/admin-image-picker.component';
import { extractApiError } from '../../../shared/utils/api-error';
import { AdminProductsService, CatalogProductDto, CategoryDto } from '../../services/admin-products.service';

type ProductControl = 'name' | 'defaultUnit' | 'defaultShelfLifeDays' | 'categoryId';

@Component({
  selector: 'app-product-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule, AdminModalComponent, AdminImagePickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-admin-modal
      [title]="isEdit() ? 'Edytuj produkt' : 'Dodaj nowy produkt'"
      [subtitle]="isEdit() ? product()!.name : 'Produkt zostanie dodany do globalnego katalogu.'"
      [maxWidth]="560"
      (close)="cancel.emit()">

      <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4" novalidate>
        <div class="flex flex-col gap-1.5">
          <label for="product-name" class="text-xs font-bold text-neutral-700">Nazwa produktu</label>
          <input id="product-name" type="text" formControlName="name" autocomplete="off"
                 class="h-11 px-3.5 rounded-xl border bg-neutral-50 text-sm outline-none focus:bg-white focus:border-[#536500]"
                 [class.border-rose-400]="isInvalid('name')"
                 [class.border-neutral-200]="!isInvalid('name')" />
          @if (isInvalid('name')) {
            <span class="text-[11px] font-semibold text-rose-600">Nazwa jest wymagana (maks. 100 znaków).</span>
          }
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="product-category" class="text-xs font-bold text-neutral-700">Kategoria</label>
          <select id="product-category" formControlName="categoryId"
                  class="h-11 px-3 rounded-xl border bg-neutral-50 text-sm outline-none focus:bg-white focus:border-[#536500] cursor-pointer"
                  [class.border-rose-400]="isInvalid('categoryId')"
                  [class.border-neutral-200]="!isInvalid('categoryId')">
            <option value="" disabled>Wybierz kategorię…</option>
            @for (category of categories(); track category.id) {
              <option [value]="category.id">{{ category.name }}</option>
            }
          </select>
          @if (isInvalid('categoryId')) {
            <span class="text-[11px] font-semibold text-rose-600">Wybierz kategorię produktu.</span>
          }
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label for="product-unit" class="text-xs font-bold text-neutral-700">Domyślna jednostka</label>
            <input id="product-unit" type="text" formControlName="defaultUnit" autocomplete="off" placeholder="szt."
                   class="h-11 px-3.5 rounded-xl border bg-neutral-50 text-sm outline-none focus:bg-white focus:border-[#536500]"
                   [class.border-rose-400]="isInvalid('defaultUnit')"
                   [class.border-neutral-200]="!isInvalid('defaultUnit')" />
            @if (isInvalid('defaultUnit')) {
              <span class="text-[11px] font-semibold text-rose-600">Maksymalnie 20 znaków.</span>
            }
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="product-shelf-life" class="text-xs font-bold text-neutral-700">Domyślny termin ważności (dni)</label>
            <input id="product-shelf-life" type="number" formControlName="defaultShelfLifeDays" min="1" max="3650"
                   class="h-11 px-3.5 rounded-xl border bg-neutral-50 text-sm outline-none focus:bg-white focus:border-[#536500]"
                   [class.border-rose-400]="isInvalid('defaultShelfLifeDays')"
                   [class.border-neutral-200]="!isInvalid('defaultShelfLifeDays')" />
            @if (isInvalid('defaultShelfLifeDays')) {
              <span class="text-[11px] font-semibold text-rose-600">Wartość od 1 do 3650 dni.</span>
            }
          </div>
        </div>

        <app-admin-image-picker
          label="Zdjęcie produktu"
          kind="product"
          [prompt]="form.controls.name.value"
          [value]="imageUrl()"
          (valueChange)="imageUrl.set($event)" />

        @if (errorMessage()) {
          <div class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {{ errorMessage() }}
          </div>
        }

        <div class="flex justify-end gap-2.5 pt-2">
          <button type="button" (click)="cancel.emit()" [disabled]="isSaving()"
                  class="h-10 px-4 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-700 font-bold text-xs cursor-pointer disabled:opacity-50">
            Anuluj
          </button>
          <button type="submit" [disabled]="isSaving()"
                  class="h-10 px-5 rounded-xl bg-[#536500] hover:bg-[#435200] text-white font-bold text-xs shadow-md shadow-[#536500]/20 cursor-pointer disabled:opacity-60">
            {{ isSaving() ? 'Zapisywanie…' : (isEdit() ? 'Zapisz zmiany' : 'Dodaj produkt') }}
          </button>
        </div>
      </form>
    </app-admin-modal>
  `
})
export class ProductFormModalComponent implements OnInit {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly productsService = inject(AdminProductsService);

  readonly product = input<CatalogProductDto | null>(null);
  readonly categories = input<CategoryDto[]>([]);

  readonly saved = output<CatalogProductDto>();
  readonly cancel = output<void>();

  readonly isSaving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly imageUrl = signal<string | null>(null);

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    defaultUnit: ['szt.', Validators.maxLength(20)],
    defaultShelfLifeDays: [7, [Validators.required, Validators.min(1), Validators.max(3650)]],
    categoryId: ['', Validators.required]
  });

  isEdit = () => this.product() !== null;

  ngOnInit(): void {
    const product = this.product();
    if (product) {
      this.form.patchValue({
        name: product.name,
        defaultUnit: product.defaultUnit ?? '',
        defaultShelfLifeDays: product.defaultShelfLifeDays ?? 7,
        categoryId: product.categoryId ?? ''
      });
      this.imageUrl.set(product.imageUrl ?? null);
    }
  }

  isInvalid(controlName: ProductControl): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const value = {
      name: raw.name.trim(),
      imageUrl: this.imageUrl(),
      defaultUnit: raw.defaultUnit.trim() || null,
      defaultShelfLifeDays: raw.defaultShelfLifeDays,
      categoryId: raw.categoryId
    };

    const product = this.product();
    const request$ = product
      ? this.productsService.updateProduct(product.id, value)
      : this.productsService.createProduct(value);

    this.isSaving.set(true);
    this.errorMessage.set(null);

    request$.subscribe({
      next: (saved) => {
        this.isSaving.set(false);
        this.saved.emit(saved);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.errorMessage.set(extractApiError(err, 'Nie udało się zapisać produktu.'));
      }
    });
  }
}

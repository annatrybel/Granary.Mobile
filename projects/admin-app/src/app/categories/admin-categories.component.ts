import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminModalComponent } from '../shared/components/admin-modal/admin-modal.component';
import { extractApiError } from '../shared/utils/api-error';
import { APP_ICONS } from '@granary/shared';
import { AdminCategoriesService, AdminCategory } from './services/admin-categories.service';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const PLACEHOLDER_IMAGE = '/icons/food-placeholder.svg';

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AdminModalComponent, APP_ICONS],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-extrabold text-neutral-900 tracking-tight m-0">Kategorie</h1>
        <p class="text-sm text-neutral-500 mt-1 mb-0">Zarządzaj nazwami, kolejnością i grafikami kategorii.</p>
      </div>
      <button type="button" (click)="loadCategories()"
        class="h-10 px-4 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 font-bold text-xs cursor-pointer">
        Odśwież
      </button>
    </div>

    @if (errorMessage()) {
      <div class="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold" role="alert">
        {{ errorMessage() }}
      </div>
    }

    <div class="bg-white rounded-2xl border border-neutral-200/90 shadow-2xs overflow-hidden relative">
      @if (isLoading()) {
        <div class="absolute inset-0 bg-white/70 flex items-center justify-center z-10 font-bold text-xs text-[#536500]">
          Ładowanie kategorii…
        </div>
      }

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="bg-neutral-50/80 border-b border-neutral-200/80 text-[11px] font-extrabold text-neutral-500 uppercase tracking-wider">
              <th class="py-3.5 px-6">Podgląd</th>
              <th class="py-3.5 px-6">Nazwa</th>
              <th class="py-3.5 px-6">Display order</th>
              <th class="py-3.5 px-6 text-right">Akcje</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100">
            @for (category of categories(); track category.id) {
              <tr class="hover:bg-neutral-50/60 transition-colors">
                <td class="py-3 px-6">
                  <img [src]="category.imageUrl || placeholderImage" [alt]="category.name"
                    class="w-12 h-12 rounded-xl object-cover border border-neutral-200 bg-neutral-100"
                    (error)="onImageError($event)" />
                </td>
                <td class="py-3 px-6 font-bold text-neutral-900">{{ category.name }}</td>
                <td class="py-3 px-6 text-neutral-600">{{ category.displayOrder }}</td>
                <td class="py-3 px-6 text-right">
                  <button type="button" (click)="editCategory(category)" [attr.aria-label]="'Edytuj kategorię ' + category.name"
                    class="w-8 h-8 rounded-lg text-neutral-400 hover:text-[#536500] hover:bg-[#536500]/10 inline-flex items-center justify-center transition-colors cursor-pointer">
                    <svg lucidePencil [size]="15"></svg>
                  </button>
                </td>
              </tr>
            } @empty {
              @if (!isLoading()) {
                <tr><td colspan="4" class="py-10 text-center text-neutral-500">Brak kategorii do wyświetlenia.</td></tr>
              }
            }
          </tbody>
        </table>
      </div>
    </div>

    @if (editedCategory(); as category) {
      <app-admin-modal title="Edytuj kategorię" [subtitle]="category.name" [maxWidth]="560" (close)="closeEditor()">
        <form [formGroup]="form" (ngSubmit)="saveCategory()" class="flex flex-col gap-4" novalidate>
          <div class="flex flex-col gap-1.5">
            <label for="category-name" class="text-xs font-bold text-neutral-700">Nazwa</label>
            <input id="category-name" type="text" formControlName="name" maxlength="100"
              class="h-11 px-3.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm outline-none focus:bg-white focus:border-[#536500]"
              [class.border-rose-400]="isNameInvalid()" />
            @if (isNameInvalid()) {
              <span class="text-[11px] font-semibold text-rose-600">Nazwa jest wymagana (maks. 100 znaków).</span>
            }
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="category-order" class="text-xs font-bold text-neutral-700">Display order</label>
            <input id="category-order" type="number" formControlName="displayOrder" min="0" step="1"
              class="h-11 px-3.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm outline-none focus:bg-white focus:border-[#536500]" />
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="category-image-url" class="text-xs font-bold text-neutral-700">Adres URL grafiki</label>
            <input id="category-image-url" type="url" formControlName="imageUrl" (input)="onImageUrlChange()"
              placeholder="https://…"
              class="h-11 px-3.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm outline-none focus:bg-white focus:border-[#536500]"
              [class.border-rose-400]="form.controls.imageUrl.invalid && form.controls.imageUrl.touched" />
            @if (form.controls.imageUrl.invalid && form.controls.imageUrl.touched) {
              <span class="text-[11px] font-semibold text-rose-600">Podaj poprawny adres zaczynający się od http:// lub https://.</span>
            }
          </div>

          <div class="grid grid-cols-[96px_1fr] items-center gap-4">
            <img [src]="previewImageUrl()" alt="Podgląd grafiki kategorii"
              class="w-24 h-24 rounded-2xl border border-neutral-200 bg-neutral-100 object-cover"
              (error)="onPreviewError($event)" />
            <div class="flex flex-col gap-2">
              <label for="category-image-file" class="text-xs font-bold text-neutral-700">Lub wgraj plik (maks. 5 MB)</label>
              <input id="category-image-file" type="file" accept="image/*" (change)="onFileChange($event)"
                class="text-xs text-neutral-600 file:mr-3 file:rounded-lg file:border file:border-neutral-200 file:bg-white file:px-3 file:py-2 file:text-xs file:font-bold" />
              @if (selectedFile()) {
                <span class="text-[11px] text-neutral-500 truncate">{{ selectedFile()?.name }}</span>
              }
            </div>
          </div>

          @if (editorError()) {
            <div class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold" role="alert">
              {{ editorError() }}
            </div>
          }

          <div class="flex justify-end gap-2.5 pt-2">
            <button type="button" (click)="closeEditor()" [disabled]="isSaving()"
              class="h-10 px-4 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-700 font-bold text-xs cursor-pointer disabled:opacity-50">
              Anuluj
            </button>
            <button type="submit" [disabled]="isSaving()"
              class="h-10 px-5 rounded-xl bg-[#536500] hover:bg-[#435200] text-white font-bold text-xs shadow-md shadow-[#536500]/20 cursor-pointer disabled:opacity-60">
              {{ isSaving() ? 'Zapisywanie…' : 'Zapisz zmiany' }}
            </button>
          </div>
        </form>
      </app-admin-modal>
    }
  `
})
export class AdminCategoriesComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly categoriesService = inject(AdminCategoriesService);

  readonly placeholderImage = PLACEHOLDER_IMAGE;
  readonly categories = signal<AdminCategory[]>([]);
  readonly editedCategory = signal<AdminCategory | null>(null);
  readonly selectedFile = signal<File | null>(null);
  readonly previewUrl = signal<string | null>(null);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly editorError = signal<string | null>(null);

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    displayOrder: [0, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
    imageUrl: ['', Validators.pattern(/^$|^https?:\/\/.+/i)]
  });

  ngOnInit(): void {
    this.loadCategories();
  }

  ngOnDestroy(): void {
    this.revokePreviewUrl();
  }

  loadCategories(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.categoriesService.getCategories().subscribe({
      next: categories => {
        this.categories.set([...categories].sort((a, b) => a.displayOrder - b.displayOrder));
        this.isLoading.set(false);
      },
      error: error => {
        this.errorMessage.set(extractApiError(error, 'Nie udało się pobrać kategorii.'));
        this.isLoading.set(false);
      }
    });
  }

  editCategory(category: AdminCategory): void {
    this.editorError.set(null);
    this.selectedFile.set(null);
    this.revokePreviewUrl();
    this.form.reset({
      name: category.name,
      displayOrder: category.displayOrder,
      imageUrl: category.imageUrl ?? ''
    });
    this.editedCategory.set(category);
  }

  closeEditor(): void {
    if (this.isSaving()) return;
    this.revokePreviewUrl();
    this.selectedFile.set(null);
    this.editedCategory.set(null);
  }

  previewImageUrl(): string {
    return this.previewUrl() || this.form.controls.imageUrl.value || PLACEHOLDER_IMAGE;
  }

  onImageUrlChange(): void {
    this.editorError.set(null);
    if (!this.selectedFile()) return;
    this.selectedFile.set(null);
    this.revokePreviewUrl();
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.editorError.set('Wybierz plik graficzny.');
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      this.editorError.set('Plik jest za duży (maksymalnie 5 MB).');
      return;
    }

    this.editorError.set(null);
    this.form.controls.imageUrl.setValue('');
    this.form.controls.imageUrl.markAsUntouched();
    this.revokePreviewUrl();
    this.selectedFile.set(file);
    this.previewUrl.set(URL.createObjectURL(file));
  }

  saveCategory(): void {
    const category = this.editedCategory();
    if (!category || this.isSaving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const update = {
      name: value.name.trim(),
      displayOrder: Number(value.displayOrder),
      imageUrl: value.imageUrl.trim() || null
    };

    this.isSaving.set(true);
    this.editorError.set(null);
    const request = this.selectedFile()
      ? this.categoriesService.updateCategoryWithFile(category.id, update, this.selectedFile()!)
      : this.categoriesService.updateCategory(category.id, update);

    request.subscribe({
      next: updated => {
        this.categories.update(items => items
          .map(item => item.id === updated.id ? updated : item)
          .sort((a, b) => a.displayOrder - b.displayOrder));
        this.isSaving.set(false);
        this.closeEditor();
      },
      error: error => {
        this.editorError.set(extractApiError(error, 'Nie udało się zapisać kategorii.'));
        this.isSaving.set(false);
      }
    });
  }

  isNameInvalid(): boolean {
    return this.form.controls.name.invalid && this.form.controls.name.touched;
  }

  onImageError(event: Event): void {
    const image = event.target as HTMLImageElement;
    image.onerror = null;
    image.src = PLACEHOLDER_IMAGE;
  }

  onPreviewError(event: Event): void {
    const image = event.target as HTMLImageElement;
    if (image.src.endsWith(PLACEHOLDER_IMAGE)) return;
    image.src = PLACEHOLDER_IMAGE;
  }

  private revokePreviewUrl(): void {
    const previewUrl = this.previewUrl();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    this.previewUrl.set(null);
  }
}

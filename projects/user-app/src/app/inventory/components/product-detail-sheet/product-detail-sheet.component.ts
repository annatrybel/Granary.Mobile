import {
  Component,
  input,
  output,
  signal,
  inject,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductItem } from '../../../core/db/app-database';
import { ProductDetailUpdatePayload, APP_ICONS, SwipeToCloseDirective } from '@granary/shared';
import { PantryService } from '../../../core/services/pantry.service';
import { TranslatePipe } from '@granary/shared';
import { TranslationService } from '@granary/shared';
import { MediaUrlPipe } from '@granary/shared';



export interface LocationOption {
  key: 'Lodówka' | 'Zamrażarka' | 'Spiżarnia';
  icon: string;
}

export interface QuickDayOption {
  days: number;
  key: string;
  label: string;
}

export interface ProductDetailSheetSavePayload extends ProductDetailUpdatePayload {
  categoryName?: string;
  categoryId?: string;
  customImageUrl?: string;
}

@Component({
  selector: 'app-product-detail-sheet',
  standalone: true,
  imports: [CommonModule, TranslatePipe, MediaUrlPipe, APP_ICONS, SwipeToCloseDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-detail-sheet.component.html',
  styleUrl: './product-detail-sheet.component.scss'
})
export class ProductDetailSheetComponent implements OnInit {
  private readonly pantryService = inject(PantryService);
  private readonly cdr = inject(ChangeDetectorRef);
  protected readonly translationService = inject(TranslationService);

  product = input.required<ProductItem>();
  closeSheet = output<void>();
  save = output<ProductDetailSheetSavePayload>();

  readonly categories = this.pantryService.categories;

  readonly locationOptions: LocationOption[] = [
    { key: 'Lodówka', icon: '/icons/fridge.svg' },
    { key: 'Zamrażarka', icon: '/icons/freezer.svg' },
    { key: 'Spiżarnia', icon: '/icons/pantry.svg' }
  ];

  readonly quickDayOptions: QuickDayOption[] = [
    { days: 3, key: 'plus3Days', label: '+3 dni' },
    { days: 7, key: 'plus7Days', label: '+7 dni' },
    { days: 14, key: 'plus2Weeks', label: '+2 tyg' }
  ];

  detailLocation = signal<'Lodówka' | 'Zamrażarka' | 'Spiżarnia'>('Lodówka');
  detailCategoryName = signal<string>('Inne');
  detailQuantity = signal<number>(1);
  detailUnit = signal<string>('szt.');
  detailExpirationDate = signal<string>('');

  detailImageUrl = signal<string | null>(null);
  isGeneratingImage = signal<boolean>(false);

  get isCustomProduct(): boolean {
    const item = this.product();
    return item.isCustom === true || (item.isCustom !== false && !item.catalogProductId);
  }

  ngOnInit(): void {
    if (this.categories().length === 0) {
      this.pantryService.loadCategories();
    }

    const item = this.product();

    const loc = item.locationName === 'Zamrażarka'
      ? 'Zamrażarka'
      : item.locationName === 'Spiżarnia'
        ? 'Spiżarnia'
        : 'Lodówka';
    this.detailLocation.set(loc);

    this.detailCategoryName.set(item.categoryName || 'Inne');
    this.detailQuantity.set(Number(item.quantity) || 1);
    this.detailUnit.set(item.unit || 'szt.');

    this.detailImageUrl.set(item.imageUrl || null);

    if (item.expirationDate) {
      this.detailExpirationDate.set(item.expirationDate);
    } else {
      const d = new Date();
      d.setDate(d.getDate() + (item.expiryDays ?? 7));
      this.detailExpirationDate.set(d.toISOString().split('T')[0]);
    }
  }

  changeQuantity(delta: number): void {
    this.detailQuantity.update(q => Math.max(1, q + delta));
  }

  addDaysToExpiry(days: number): void {
    const current = this.detailExpirationDate()
      ? new Date(this.detailExpirationDate())
      : new Date();
    current.setDate(current.getDate() + days);
    this.detailExpirationDate.set(current.toISOString().split('T')[0]);
  }

  generateAiProductImage(): void {
    if (!this.isCustomProduct) return;

    const productName = this.product().name.trim();
    if (!productName) return;

    this.isGeneratingImage.set(true);

    this.pantryService.generateProductImage(productName).subscribe({
      next: (res) => {
        if (res.success && res.imageUrl) {
          // Upewniamy się, że pre-loading w obiekcie Image() odpytuje /uploads/...
          const resolvedSrc = res.imageUrl.startsWith('http') || res.imageUrl.startsWith('data:')
            ? res.imageUrl
            : `/uploads/${res.imageUrl.replace(/^\/?(uploads\/)?/, '')}`;

          const img = new Image();
          img.onload = () => {
            // Zapisujemy czysty klucz zwrócony z backendu (szablon HTML użyje MediaUrlPipe)
            this.detailImageUrl.set(res.imageUrl);
            this.isGeneratingImage.set(false); 
            this.cdr.markForCheck();
          };
          img.onerror = () => {
            this.isGeneratingImage.set(false);
            alert('Błąd wczytywania wygenerowanego zdjęcia.');
            this.cdr.markForCheck();
          };
          img.src = resolvedSrc;
        } else {
          this.isGeneratingImage.set(false);
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        this.isGeneratingImage.set(false);
        const msg = err.error?.message || 'Nie udało się wygenerować zdjęcia produktu.';
        alert(msg);
        this.cdr.markForCheck();
      }
    });
  }

  removeImage(): void {
    if (!this.isCustomProduct) return;
    this.detailImageUrl.set(null);
  }

  onImageFileChange(event: Event): void {
    if (!this.isCustomProduct) return;

    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.detailImageUrl.set(e.target?.result as string);
        this.cdr.markForCheck();
      };
      reader.readAsDataURL(file);
    }
  }

  onSave(): void {
    const selectedCategory = this.categories().find(
      c => c.name.toLowerCase() === this.detailCategoryName().toLowerCase()
    );

    this.save.emit({
      locationName: this.detailLocation(),
      quantity: this.detailQuantity(),
      unit: this.detailUnit(),
      expirationDate: this.detailExpirationDate(),
      categoryName: this.detailCategoryName(),
      categoryId: selectedCategory?.id,
      customImageUrl: this.isCustomProduct ? this.detailImageUrl() || undefined : undefined
    });
  }

}
import { Component, signal, computed, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PantryService } from '../core/services/pantry.service';
import { ProductItem } from '../core/db/app-database';
import { CatalogProductDto, APP_ICONS } from '@granary/shared';
import { compressAndConvertToJpeg } from '../core/utils/image-compressor.util';

import { ConfirmDeleteModalComponent } from '@granary/shared';
import { CatalogSearchBarComponent } from '../shared/components/catalog-search-bar/catalog-search-bar.component';
import { InventoryCardComponent } from './components/inventory-card/inventory-card.component';
import { InventoryRecipeBarComponent } from './components/inventory-recipe-bar/inventory-recipe-bar.component';
import {
  ProductDetailSheetComponent,
  ProductDetailSheetSavePayload
} from './components/product-detail-sheet/product-detail-sheet.component';
import { TranslatePipe } from '@granary/shared';
import { getHttpErrorMessage } from '../core/utils/http-error-message.util';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [
    CommonModule,
    ConfirmDeleteModalComponent,
    CatalogSearchBarComponent,
    InventoryCardComponent,
    InventoryRecipeBarComponent,
    ProductDetailSheetComponent,
    TranslatePipe,
    APP_ICONS,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inventory.component.html'
})
export class InventoryComponent {
  private router = inject(Router);
  private pantryService = inject(PantryService);
  private cdr = inject(ChangeDetectorRef);

  selectedLocation = signal<string>('all');
  selectedIds = signal<Set<string>>(new Set());

  // Stan analizy zdjęcia przez Groq AI
  isAnalyzingImage = signal<boolean>(false);

  readonly locationFilters = [
    { key: 'all', label: 'Wszystko' },
    { key: 'Lodówka', label: 'Lodówka' },
    { key: 'Zamrażarka', label: 'Zamrażarka' },
    { key: 'Spiżarnia', label: 'Spiżarnia' }
  ];

  productToDelete = signal<ProductItem | null>(null);
  activeProductForDetails = signal<ProductItem | null>(null);

  products = this.pantryService.products;

  filteredItems = computed(() => {
    const loc = this.selectedLocation();
    const all = this.products();
    if (loc === 'all') return all;
    return all.filter(item => item.locationName === loc);
  });

  selectedCount = computed(() => this.selectedIds().size);

  selectedNames = computed(() => {
    const ids = this.selectedIds();
    return this.products()
      .filter(item => ids.has(item.id))
      .map(item => item.name)
      .join(', ');
  });

  setLocation(key: string): void {
    this.selectedLocation.update(current => current === key && key !== 'all' ? 'all' : key);
  }

  async onPhotoCaptured(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.isAnalyzingImage.set(true);
    this.cdr.markForCheck();

    try {
      const preparedFile = await compressAndConvertToJpeg(file);

      this.pantryService.recognizeProductFromImage(preparedFile).subscribe({
        next: (recognized) => {
          this.isAnalyzingImage.set(false);

          this.pantryService.addProduct({
            name: recognized.name,
            isCustom: true,
            category: recognized.categoryName.toLowerCase(),
            categoryName: recognized.categoryName,
            locationName: recognized.suggestedLocation || 'Lodówka',
            imageUrl: recognized.imageUrl, // Zapisane na serwerze zdjęcie
            quantity: 1,
            unit: recognized.defaultUnit || 'szt.',
            expiryDays: recognized.estimatedExpiryDays || 7
          });

          input.value = '';
          this.cdr.markForCheck();
        },
        error: (err: unknown) => {
          this.isAnalyzingImage.set(false);
          input.value = '';
          this.cdr.markForCheck();
          alert(getHttpErrorMessage(err, 'Nie udało się rozpoznać produktu na zdjęciu.'));
        }
      });
    } catch (compressionError) {
      console.error('Błąd kompresji zdjęcia:', compressionError);
      this.isAnalyzingImage.set(false);
      input.value = '';
      this.cdr.markForCheck();
      alert('Nie udało się przygotować formatu zdjęcia do wysłania.');
    }
  }

  onSelectSuggestion(product: CatalogProductDto): void {
    this.pantryService.addProduct({
      catalogProductId: product.id,
      isCustom: false,
      name: product.name,
      category: 'ogolne',
      categoryName: product.categoryName || 'Inne',
      categoryImageUrl: product.categoryImageUrl ?? null,
      locationName: this.selectedLocation() !== 'all' ? this.selectedLocation() : 'Lodówka',
      imageUrl: product.imageUrl,
      quantity: 1,
      unit: product.defaultUnit || 'szt.',
      expiryDays: 7
    });
  }

  onAddCustomProduct(name?: string): void {
    const customName = (name || '').trim();
    if (!customName) return;

    this.pantryService.addProduct({
      name: customName,
      isCustom: true, 
      catalogProductId: null,
      category: 'ogolne',
      categoryName: 'Inne',
      locationName: this.selectedLocation() !== 'all' ? this.selectedLocation() : 'Lodówka',
      imageUrl: null,
      quantity: 1,
      unit: 'szt.',
      expiryDays: 7
    });
  }

  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  toggleSelect(id: string, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    this.selectedIds.update(ids => {
      const next = new Set(ids);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  openDetails(item: ProductItem): void {
    this.activeProductForDetails.set(item);
  }

  closeDetails(): void {
    this.activeProductForDetails.set(null);
  }

  onSaveProductDetails(payload: ProductDetailSheetSavePayload): void {
    const item = this.activeProductForDetails();
    if (!item) return;

    void this.pantryService.updateProduct(item.id, payload).catch(error => {
      console.error('Nie udało się zaktualizować produktu:', error);
      alert('Nie udało się zaktualizować produktu. Spróbuj ponownie.');
    });
    this.closeDetails();
  }

  resolveItem(item: ProductItem, status: 'consume' | 'waste'): void {
    const previousItems = this.products();
    const previousIndex = previousItems.findIndex(product => product.id === item.id);
    this.products.update(items => items.filter(product => product.id !== item.id));

    void this.pantryService.resolveProduct(item.id, status).catch(error => {
      this.products.update(items => {
        if (items.some(product => product.id === item.id)) return items;
        const restoredItems = [...items];
        restoredItems.splice(Math.max(0, Math.min(previousIndex, restoredItems.length)), 0, item);
        return restoredItems;
      });
      console.error(`Nie udało się ${status === 'consume' ? 'zużyć' : 'wyrzucić'} produktu:`, error);
      alert('Nie udało się zaktualizować produktu. Spróbuj ponownie.');
    });
  }

  deleteProductFromDetails(item: ProductItem): void {
    void this.pantryService.deleteProduct(item.id).then(() => this.closeDetails()).catch(error => {
      console.error('Nie udało się usunąć produktu:', error);
      alert('Nie udało się usunąć produktu. Spróbuj ponownie.');
    });
  }

  askRemoveItem(item: ProductItem, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    this.productToDelete.set(item);
  }

  cancelDelete(): void {
    this.productToDelete.set(null);
  }

  confirmDelete(): void {
    const item = this.productToDelete();
    if (item) {
      this.pantryService.deleteProduct(item.id);
      this.selectedIds.update(ids => {
        const copy = new Set(ids);
        copy.delete(item.id);
        return copy;
      });
      this.productToDelete.set(null);
    }
  }

  generateRecipe(): void {
    const selected = this.products().filter(item => this.selectedIds().has(item.id));
    const targetProductIds = selected
      .map(item => (item as any).productId || (item as any).catalogProductId || item.id)
      .filter(id => !!id);

    if (targetProductIds.length === 0) return;

    this.router.navigate(['/przepisy'], {
      queryParams: { items: targetProductIds.join(',') }
    });
  }
}
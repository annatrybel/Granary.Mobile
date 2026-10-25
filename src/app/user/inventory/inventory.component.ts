import { Component, signal, computed, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { PantryService } from '../../core/services/pantry.service';
import { ProductItem } from '../../core/db/app-database';
import { ProductDetailUpdatePayload, CatalogProductDto } from './models/inventory.models';

import { ConfirmDeleteModalComponent } from '../../shared/components/confirm-delete-modal/confirm-delete-modal.component';
import { CatalogSearchBarComponent } from '../../shared/components/catalog-search-bar/catalog-search-bar.component';
import { InventoryCardComponent } from './components/inventory-card/inventory-card.component';
import { InventoryRecipeBarComponent } from './components/inventory-recipe-bar/inventory-recipe-bar.component';
import { ProductDetailSheetComponent } from './components/product-detail-sheet/product-detail-sheet.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    ConfirmDeleteModalComponent,
    CatalogSearchBarComponent,
    InventoryCardComponent,
    InventoryRecipeBarComponent,
    ProductDetailSheetComponent,
    TranslatePipe
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

  // --- ZROBIENIE ZDJĘCIA APARATEM / WYBÓR Z DYSKU ---
  onPhotoCaptured(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.isAnalyzingImage.set(true);
    this.cdr.markForCheck();

    this.pantryService.recognizeProductFromImage(file).subscribe({
      next: (recognized) => {
        this.isAnalyzingImage.set(false);

        // Automatycznie dodajemy produkt rozpoznany przez Groq AI do lodówki/spiżarni
        this.pantryService.addProduct({
          name: recognized.name,
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
      error: (err: any) => {
        this.isAnalyzingImage.set(false);
        input.value = '';
        this.cdr.markForCheck();
        alert(err?.error?.message || 'Nie udało się rozpoznać produktu na zdjęciu.');
      }
    });
  }

  onSelectSuggestion(product: CatalogProductDto): void {
    this.pantryService.addProduct({
      catalogProductId: product.id,
      name: product.name,
      category: 'ogolne',
      categoryName: product.categoryName || 'Inne',
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

  onSaveProductDetails(payload: ProductDetailUpdatePayload): void {
    const item = this.activeProductForDetails();
    if (!item) return;

    this.pantryService.updateProduct(item.id, payload);
    this.closeDetails();
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
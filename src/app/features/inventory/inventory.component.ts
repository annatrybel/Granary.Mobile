import { Component, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
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
    ProductDetailSheetComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inventory.component.html'
})
export class InventoryComponent {
  private router = inject(Router);
  private pantryService = inject(PantryService);

  selectedLocation = signal<string>('all');
  selectedIds = signal<Set<string>>(new Set());

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

    if (loc === 'all') {
      return all;
    }

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

  openCameraScanner(): void {
    alert('Skaner kodów kreskowych');
  }

  generateRecipe(): void {
    const selected = this.products().filter(item => this.selectedIds().has(item.id));
    
    const targetProductIds = selected
      .map(item => (item as any).catalogProductId || (item as any).productId || item.id)
      .filter(id => !!id);

    if (targetProductIds.length === 0) return;

    this.router.navigate(['/przepisy'], { 
      queryParams: { items: targetProductIds.join(',') } 
    });
  }
}
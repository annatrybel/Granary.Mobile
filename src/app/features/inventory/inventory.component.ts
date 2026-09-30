import { Component, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { PantryService } from '../../core/services/pantry.service';
import { ProductItem } from '../../core/db/app-database';
import { StorageCategory, ProductDetailUpdatePayload, CatalogProductDto } from './models/inventory.models';

import { ConfirmDeleteModalComponent } from '../../shared/components/confirm-delete-modal/confirm-delete-modal.component';
import { CatalogSearchBarComponent } from '../../shared/components/catalog-search-bar/catalog-search-bar.component';

import { InventoryFilterTabsComponent } from './components/inventory-filter-tabs/inventory-filter-tabs.component';
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
    InventoryFilterTabsComponent,
    InventoryCardComponent,
    InventoryRecipeBarComponent,
    ProductDetailSheetComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.scss'
})
export class InventoryComponent {
  private router = inject(Router);
  private pantryService = inject(PantryService);

  selectedCategory = signal<StorageCategory>('all');
  searchQuery = signal<string>('');
  selectedIds = signal<Set<string>>(new Set());

  productToDelete = signal<ProductItem | null>(null);
  activeProductForDetails = signal<ProductItem | null>(null);

  products = this.pantryService.products;

  filteredItems = computed(() => {
    const category = this.selectedCategory();
    const query = this.searchQuery().toLowerCase().trim();

    return this.products().filter(item => {
      const itemCat = (item.category || item.locationName || '').toLowerCase();
      const matchesCategory = category === 'all' || itemCat.includes(category);
      const matchesQuery = !query || item.name.toLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });
  });

  selectedCount = computed(() => this.selectedIds().size);

  selectedNames = computed(() => {
    const ids = this.selectedIds();
    return this.products()
      .filter(item => ids.has(item.id))
      .map(item => item.name)
      .join(', ');
  });

  setCategory(category: StorageCategory): void {
    this.selectedCategory.set(category);
  }

  onSelectSuggestion(product: CatalogProductDto): void {
    const categoryName = (product.categoryName || product.category || 'Lodówka').toLowerCase();
    let mappedCat: StorageCategory = 'lodowka';
    if (categoryName.includes('zamraż') || categoryName.includes('freezer')) mappedCat = 'zamrazarka';
    if (categoryName.includes('spiż') || categoryName.includes('pantry')) mappedCat = 'spizarnia';

    this.pantryService.addProduct({
      catalogProductId: product.id,
      name: product.name,
      category: mappedCat,
      locationName: mappedCat === 'zamrazarka' ? 'Zamrażarka' : mappedCat === 'spizarnia' ? 'Spiżarnia' : 'Lodówka',
      imageUrl: product.imageUrl,
      quantity: 1,
      unit: product.defaultUnit || 'szt.',
      expiryDays: 7
    });
  }

  onAddCustomProduct(name?: string): void {
    const customName = (name || this.searchQuery()).trim();
    if (!customName) return;

    this.pantryService.addProduct({
      name: customName,
      category: 'spizarnia',
      locationName: 'Spiżarnia',
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
    this.router.navigate(['/generuj-przepis'], { 
      queryParams: { items: Array.from(this.selectedIds()).join(',') } 
    });
  }
}
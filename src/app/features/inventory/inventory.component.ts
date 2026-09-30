import { Component, signal, computed, inject, ElementRef, HostListener, OnInit, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { PantryService } from '../../core/services/pantry.service';
import { ProductItem } from '../../core/db/app-database';
import { environment } from '../../../environments/environment';

import { StorageCategory, CatalogProductDto, ProductDetailUpdatePayload } from './models/inventory.models';
import { ConfirmDeleteModalComponent } from '../../shared/components/confirm-delete-modal/confirm-delete-modal.component';
import { ProductDetailSheetComponent } from './components/product-detail-sheet/product-detail-sheet.component';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [
    CommonModule, 
    LucideAngularModule, 
    ConfirmDeleteModalComponent, 
    ProductDetailSheetComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.scss'
})
export class InventoryComponent implements OnInit {
  private router = inject(Router);
  private http = inject(HttpClient);
  private pantryService = inject(PantryService);
  private elementRef = inject(ElementRef);
  private destroyRef = inject(DestroyRef);

  // Stany strony
  productToDelete = signal<ProductItem | null>(null);
  activeProductForDetails = signal<ProductItem | null>(null);
  selectedCategory = signal<StorageCategory>('all');
  searchQuery = signal<string>('');
  selectedIds = signal<Set<string>>(new Set());

  // Autocomplete katalogu
  catalogSuggestions = signal<CatalogProductDto[]>([]);
  isSearchingCatalog = signal<boolean>(false);
  showSuggestions = signal<boolean>(false);
  private searchInput$ = new Subject<string>();

  // Reaktywny magazyn
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

  ngOnInit(): void {
    this.searchInput$.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap(term => {
        const trimmed = term.trim();
        if (trimmed.length < 2) {
          this.catalogSuggestions.set([]);
          this.isSearchingCatalog.set(false);
          return of([]);
        }

        this.isSearchingCatalog.set(true);
        const params = new HttpParams().set('query', trimmed);

        return this.http.get<CatalogProductDto[]>(`${environment.apiBaseUrl}/catalog-products`, { params }).pipe(
          catchError(() => of([]))
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(results => {
      this.catalogSuggestions.set(results || []);
      this.isSearchingCatalog.set(false);
      this.showSuggestions.set(true);
    });
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.searchInput$.next(value);
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

    this.resetSearch();
  }

  onAddCustomProduct(): void {
    const customName = this.searchQuery().trim();
    if (!customName) return;

    this.pantryService.addProduct({
      name: customName,
      category: 'spizarnia',
      locationName: 'Spiżarnia',
      quantity: 1,
      unit: 'szt.',
      expiryDays: 7
    });

    this.resetSearch();
  }

  resetSearch(): void {
    this.searchQuery.set('');
    this.showSuggestions.set(false);
    this.catalogSuggestions.set([]);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.showSuggestions.set(false);
    }
  }

  // Obsługa szczegółów produktu
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

  // Zaznaczanie (kółko checkboxa)
  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  toggleSelect(id: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    this.selectedIds.update(ids => {
      const newSet = new Set(ids);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  }

  // Usuwanie
  askRemoveItem(item: ProductItem, event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
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

  setCategory(category: StorageCategory): void {
    this.selectedCategory.set(category);
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
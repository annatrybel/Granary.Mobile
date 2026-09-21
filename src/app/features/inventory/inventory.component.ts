import { Component, signal, computed, input, output, inject, ChangeDetectionStrategy, ElementRef, HostListener, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { PantryService } from '../../core/services/pantry.service';
import { ProductItem } from '../../core/db/app-database';
import { environment } from '../../../environments/environment';

export type StorageCategory = 'all' | 'lodowka' | 'zamrazarka' | 'spizarnia';

export interface CatalogProductDto {
  id: string;
  name: string;
  categoryName?: string;
  category?: string;
  defaultUnit?: string;
  imageUrl?: string;
}

// =========================================================================
// MODAL POTWIERDZENIA USUNIĘCIA
// =========================================================================
@Component({
  selector: 'app-confirm-delete-modal',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="delete-overlay" (click)="cancel.emit()">
      <div class="delete-dialog" (click)="$event.stopPropagation()">
        <div class="delete-icon-circle">
          <svg width="18" height="20" viewBox="0 0 12 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.25 13.5C1.8375 13.5 1.48438 13.3531 1.19062 13.0594C0.896875 12.7656 0.75 12.4125 0.75 12V2.25H0V0.75H3.75V0H8.25V0.75H12V2.25H11.25V12C11.25 12.4125 11.1031 12.7656 10.8094 13.0594C10.5156 13.3531 10.1625 13.5 9.75 13.5H2.25ZM9.75 2.25H2.25V12H9.75V2.25ZM3.75 10.5H5.25V3.75H3.75V10.5ZM6.75 10.5H8.25V3.75H6.75V10.5ZM2.25 2.25V12V2.25Z" fill="#BA1A1A"/>
          </svg>
        </div>
        <h3 class="delete-title">Usunąć produkt?</h3>
        <p class="delete-desc">
          Czy na pewno chcesz usunąć <strong class="text-black">"{{ productName() }}"</strong> ze swojej spiżarni?
        </p>
        <div class="delete-actions">
          <button type="button" class="btn-cancel" (click)="cancel.emit()">Anuluj</button>
          <button type="button" class="btn-confirm" (click)="confirm.emit()">Usuń</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .delete-overlay {
      position: fixed; inset: 0; z-index: 120;
      background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center; padding: 16px;
    }
    .delete-dialog {
      width: 100%; max-width: 320px; background: #FFFFFF; border-radius: 24px;
      padding: 22px 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.18);
      border: 1px solid rgba(229, 229, 229, 0.9);
      display: flex; flex-direction: column; align-items: center; text-align: center;
    }
    .delete-icon-circle {
      width: 48px; height: 48px; border-radius: 9999px; background: #FFDAD6;
      display: flex; align-items: center; justify-content: center; margin-bottom: 12px;
    }
    .delete-title { margin: 0; color: #1C1B1B; font-size: 16px; font-weight: 700; }
    .delete-desc { margin: 4px 0 18px 0; color: #737373; font-size: 12px; font-weight: 500; }
    .delete-actions { display: flex; width: 100%; gap: 10px; }
    .btn-cancel {
      flex: 1; height: 40px; border-radius: 9999px; border: 1px solid #E5E5E5;
      background: #F6F3F2; color: #454934; font-size: 12px; font-weight: 700; cursor: pointer;
    }
    .btn-confirm {
      flex: 1; height: 40px; border-radius: 9999px; border: none;
      background: #BA1A1A; color: #FFFFFF; font-size: 12px; font-weight: 700; cursor: pointer;
    }
  `]
})
export class ConfirmDeleteModalComponent {
  productName = input<string>('');
  cancel = output<void>();
  confirm = output<void>();
}

// =========================================================================
// GŁÓWNY KOMPONENT INVENTORY
// =========================================================================
@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDeleteModalComponent, LucideAngularModule],
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

  productToDelete = signal<ProductItem | null>(null);
  selectedCategory = signal<StorageCategory>('all');
  searchQuery = signal<string>('');
  selectedIds = signal<Set<string>>(new Set());

  // Stany wyszukiwania w katalogu
  catalogSuggestions = signal<CatalogProductDto[]>([]);
  isSearchingCatalog = signal<boolean>(false);
  showSuggestions = signal<boolean>(false);
  private searchInput$ = new Subject<string>();

  // =========================================================================
  // STAN SZCZEGÓŁÓW PRODUKTU 
  // =========================================================================
  activeProductForDetails = signal<ProductItem | null>(null);
  detailLocation = signal<'Lodówka' | 'Zamrażarka' | 'Spiżarnia'>('Lodówka');
  detailQuantity = signal<number>(1);
  detailUnit = signal<string>('szt.');
  detailExpirationDate = signal<string>('');

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

  // =========================================================================
  // OBSŁUGA SZCZEGÓŁÓW PRODUKTU 
  // =========================================================================
  openDetails(item: ProductItem): void {
    this.activeProductForDetails.set(item);
    
    const loc = item.locationName === 'Zamrażarka' ? 'Zamrażarka' : item.locationName === 'Spiżarnia' ? 'Spiżarnia' : 'Lodówka';
    this.detailLocation.set(loc);

    this.detailQuantity.set(Number(item.quantity) || 1);
    this.detailUnit.set(item.unit || 'szt.');

    if (item.expirationDate) {
      this.detailExpirationDate.set(item.expirationDate);
    } else {
      const d = new Date();
      d.setDate(d.getDate() + (item.expiryDays ?? 7));
      this.detailExpirationDate.set(d.toISOString().split('T')[0]);
    }
  }

  closeDetails(): void {
    this.activeProductForDetails.set(null);
  }

  changeQuantity(delta: number): void {
    this.detailQuantity.update(q => Math.max(1, q + delta));
  }

  addDaysToExpiry(days: number): void {
    const current = this.detailExpirationDate() ? new Date(this.detailExpirationDate()) : new Date();
    current.setDate(current.getDate() + days);
    this.detailExpirationDate.set(current.toISOString().split('T')[0]);
  }

  saveProductDetails(): void {
    const item = this.activeProductForDetails();
    if (!item) return;

    this.pantryService.updateProduct(item.id, {
      locationName: this.detailLocation(),
      quantity: this.detailQuantity(),
      unit: this.detailUnit(),
      expirationDate: this.detailExpirationDate()
    });

    this.closeDetails();
  }

  // =========================================================================
  // ZAZNACZANIE I USUWANIE
  // =========================================================================
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
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }

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
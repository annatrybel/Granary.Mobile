import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminProductsService, CatalogProductDto, CategoryDto } from './services/admin-products.service';
import { AdminSearchBarComponent } from '../shared/components/admin-search-bar/admin-search-bar.component';
import { ProductFormModalComponent } from './components/product-form-modal/product-form-modal.component';
import { extractApiError } from '../shared/utils/api-error';
import { APP_ICONS } from '@granary/shared';


@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminSearchBarComponent, ProductFormModalComponent, APP_ICONS],
  templateUrl: './admin-products.component.html',
  styleUrl: './admin-products.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminProductsComponent implements OnInit {
  private readonly productsService = inject(AdminProductsService);

  readonly products = signal<CatalogProductDto[]>([]);
  readonly totalCount = signal<number>(0);
  readonly customProductsCount = signal<number>(0);
  readonly categories = signal<CategoryDto[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  /** `undefined` = modal zamknięty, `null` = dodawanie, obiekt = edycja. */
  readonly editedProduct = signal<CatalogProductDto | null | undefined>(undefined);

  readonly searchQuery = signal<string>('');
  readonly selectedCategoryId = signal<string>('all');
  readonly pageNumber = signal<number>(1);
  readonly pageSize = signal<number>(10);

  readonly kpiCards = computed(() => [
    {
      label: 'Pozycje w katalogu',
      val: this.totalCount(),
      sub: 'Zgodne z aktualnymi filtrami',
      icon: 'package',
      iconBg: 'bg-emerald-50 text-emerald-700'
    },
    {
      label: 'Produkty użytkowników',
      val: this.customProductsCount(),
      sub: 'Własne pozycje dodane przez użytkowników',
      badge: 'Własne',
      icon: 'clock',
      iconBg: 'bg-amber-50 text-amber-700'
    }
  ]);

  readonly totalPages = computed(() => Math.ceil(this.totalCount() / this.pageSize()) || 1);

  readonly displayRange = computed(() => {
    const total = this.totalCount();
    if (total === 0) return '0 z 0';
    const start = (this.pageNumber() - 1) * this.pageSize() + 1;
    const end = Math.min(this.pageNumber() * this.pageSize(), total);
    return `${start}–${end} z ${total}`;
  });

  readonly pagesList = computed<(number | string)[]>(() => {
    const total = this.totalPages();
    const current = this.pageNumber();

    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 3) return [1, 2, 3, '...', total];
    if (current >= total - 2) return [1, '...', total - 2, total - 1, total];
    return [1, '...', current, '...', total];
  });

  ngOnInit(): void {
    this.loadCategories();
    this.loadProducts();
  }

  loadCategories(): void {
    this.productsService.getCategories().subscribe({
      next: (list) => this.categories.set(list || []),
      error: () => this.categories.set([])
    });
  }

  loadProducts(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.productsService
      .getProducts(this.pageNumber(), this.pageSize(), this.searchQuery().trim(), this.selectedCategoryId())
      .subscribe({
        next: (result) => {
          this.isLoading.set(false);

          const lastPage = Math.max(1, Math.ceil(result.totalCount / this.pageSize()));
          if (this.pageNumber() > lastPage) {
            this.pageNumber.set(lastPage);
            this.loadProducts();
            return;
          }

          this.products.set(result.items ?? []);
          this.totalCount.set(result.totalCount ?? 0);
          this.customProductsCount.set(result.customProductsCount ?? 0);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(extractApiError(err, 'Błąd pobierania bazy produktów.'));
        }
      });
  }

  onFilterChange(): void {
    this.pageNumber.set(1);
    this.loadProducts();
  }

  onSearch(): void {
    this.onFilterChange();
  }

  goToPage(page: number | string): void {
    if (typeof page === 'number' && page !== this.pageNumber() && page >= 1 && page <= this.totalPages()) {
      this.pageNumber.set(page);
      this.loadProducts();
    }
  }

  nextPage(): void {
    this.goToPage(this.pageNumber() + 1);
  }

  prevPage(): void {
    this.goToPage(this.pageNumber() - 1);
  }

  editProduct(product: CatalogProductDto): void {
    this.editedProduct.set(product);
  }

  openCreateProduct(): void {
    this.editedProduct.set(null);
  }

  closeProductModal(): void {
    this.editedProduct.set(undefined);
  }

  onProductSaved(): void {
    this.closeProductModal();
    this.loadProducts();
  }

  deleteProduct(product: CatalogProductDto): void {
    if (!confirm(`Czy na pewno usunąć "${product.name}" z katalogu?`)) return;

    this.productsService.deleteProduct(product.id).subscribe({
      next: () => this.loadProducts(),
      error: (err) => alert(extractApiError(err, 'Błąd usuwania produktu.'))
    });
  }

  getCategoryBadgeClass(categoryName?: string): string {
    const c = categoryName?.toLowerCase() || '';
    if (c.includes('nabiał')) return 'bg-purple-100 text-purple-800 border-purple-200';
    if (c.includes('pieczywo')) return 'bg-amber-100 text-amber-800 border-amber-200';
    if (c.includes('warzyw') || c.includes('owoc')) return 'bg-[#BEEB1E]/40 text-[#364900] border-[#BEEB1E]';
    if (c.includes('przetwory')) return 'bg-rose-100 text-rose-800 border-rose-200';
    return 'bg-neutral-100 text-neutral-700 border-neutral-200';
  }
  exportDatabase(): void {
    console.log('Eksportowanie bazy produktów do CSV...');
  }
}
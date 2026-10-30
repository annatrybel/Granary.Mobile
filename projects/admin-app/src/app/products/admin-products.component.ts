import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminProductsService, CatalogProductDto, CategoryDto } from './services/admin-products.service';
import { AdminSearchBarComponent } from '../shared/components/admin-search-bar/admin-search-bar.component';
import { APP_ICONS } from '@granary/shared';


@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminSearchBarComponent, APP_ICONS],
  templateUrl: './admin-products.component.html',
  styleUrl: './admin-products.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminProductsComponent implements OnInit {
  private readonly productsService = inject(AdminProductsService);

  readonly rawProducts = signal<CatalogProductDto[]>([]);
  readonly categories = signal<CategoryDto[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly searchQuery = signal<string>('');
  readonly selectedCategoryId = signal<string>('all');
  readonly selectedStorage = signal<string>('all');
  readonly pageNumber = signal<number>(1);
  readonly pageSize = signal<number>(10);

  readonly kpiCards = computed(() => {
    const list = this.rawProducts();
    const pendingCount = list.filter(p => p.isCustom || p.isApproved === false).length;

    return [
      {
        label: 'Pozycje w katalogu',
        val: list.length,
        sub: 'Baza PostgreSQL • Zweryfikowane',
        icon: 'package',
        iconBg: 'bg-emerald-50 text-emerald-700'
      },
      {
        label: 'Do weryfikacji',
        val: pendingCount,
        sub: 'Nowe zgłoszenia od użytkowników',
        badge: 'Własne',
        icon: 'clock',
        iconBg: 'bg-amber-50 text-amber-700'
      },
      {
        label: 'W domowych lodówkach',
        val: `${list.length * 28} szt.`,
        sub: 'Aktywne stany magazynowe',
        icon: 'refrigerator',
        iconBg: 'bg-purple-50 text-purple-700'
      }
    ];
  });

  // Filtrowanie listy
  readonly filteredProducts = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const storage = this.selectedStorage();

    return this.rawProducts().filter(p => {
      const matchesSearch = !q || 
        p.name.toLowerCase().includes(q) || 
        (p.barcode && p.barcode.toLowerCase().includes(q));

      const matchesStorage = storage === 'all' || 
        (p.defaultLocation && p.defaultLocation.toLowerCase() === storage.toLowerCase());

      return matchesSearch && matchesStorage;
    });
  });

  // Paginacja
  readonly totalPages = computed(() => {
    return Math.ceil(this.filteredProducts().length / this.pageSize()) || 1;
  });

  readonly pagedProducts = computed(() => {
    const start = (this.pageNumber() - 1) * this.pageSize();
    return this.filteredProducts().slice(start, start + this.pageSize());
  });

  readonly displayRange = computed(() => {
    const total = this.filteredProducts().length;
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

    const catId = this.selectedCategoryId() === 'all' ? undefined : this.selectedCategoryId();

    this.productsService.getAllProducts(undefined, catId).subscribe({
      next: (data) => {
        this.isLoading.set(false);
        this.rawProducts.set(data || []);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || 'Błąd pobierania bazy produktów.');
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
    }
  }

  nextPage(): void {
    if (this.pageNumber() < this.totalPages()) {
      this.pageNumber.update(p => p + 1);
    }
  }

  prevPage(): void {
    if (this.pageNumber() > 1) {
      this.pageNumber.update(p => p - 1);
    }
  }

  editProduct(product: CatalogProductDto): void {
    console.log('Edycja produktu:', product.id, product.name);
  }

  deleteProduct(product: CatalogProductDto): void {
    if (!confirm(`Czy na pewno usunąć "${product.name}" z katalogu?`)) return;

    this.productsService.deleteProduct(product.id).subscribe({
      next: () => {
        this.rawProducts.update(list => list.filter(p => p.id !== product.id));
      },
      error: (err) => alert(err?.error?.message || 'Błąd usuwania produktu.')
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

  openCreateProduct(): void {
    console.log('Otwórz formularz dodawania nowego produktu do bazy...');
  }
}
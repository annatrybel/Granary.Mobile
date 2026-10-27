import { 
  Component, 
  input, 
  output, 
  inject, 
  signal, 
  computed, 
  HostListener, 
  DestroyRef, 
  ChangeDetectionStrategy,
  ChangeDetectorRef 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError, tap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { API_BASE_URL, CatalogProductDto, TranslatePipe, TranslationService } from '@granary/shared';

@Component({
  selector: 'app-catalog-search-bar',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './catalog-search-bar.component.html'
})
export class CatalogSearchBarComponent {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly translationService = inject(TranslationService);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  placeholderKey = input<string>('search.defaultPlaceholder');
  fallbackPlaceholder = input<string>('Szukaj lub dodaj produkt...');
  excludePantry = input<boolean>(false);

  selectProduct = output<CatalogProductDto>();
  createCustom = output<string>();

  searchQuery = signal<string>('');
  catalogSuggestions = signal<CatalogProductDto[]>([]);
  isSearching = signal<boolean>(false);
  showSuggestions = signal<boolean>(false);

  hasQuery = computed(() => this.searchQuery().trim().length > 0);
  hasMinQuery = computed(() => this.searchQuery().trim().length >= 1);

  private readonly searchInput$ = new Subject<string>();
  private readonly searchCache = new Map<string, CatalogProductDto[]>();

  constructor() {
    this.searchInput$.pipe(
      debounceTime(80),
      distinctUntilChanged(),
      switchMap(term => {
        const trimmed = term.trim();
        if (trimmed.length < 1) {
          this.catalogSuggestions.set([]);
          this.isSearching.set(false);
          this.cdr.markForCheck();
          return of([]);
        }

        const lang = this.translationService.currentLang();
        const cacheKey = `${trimmed.toLowerCase()}_${this.excludePantry()}_${lang}`;

        if (this.searchCache.has(cacheKey)) {
          this.isSearching.set(false);
          this.cdr.markForCheck();
          return of(this.searchCache.get(cacheKey)!);
        }

        this.isSearching.set(true);
        this.cdr.markForCheck();

        let params = new HttpParams().set('query', trimmed);
        if (this.excludePantry()) {
          params = params.set('excludePantry', 'true');
        }

        return this.http.get<CatalogProductDto[]>(`${this.apiBaseUrl}/catalog-products`, { params }).pipe(
          tap(results => this.searchCache.set(cacheKey, results || [])),
          catchError(() => of([]))
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(results => {
      this.catalogSuggestions.set(results || []);
      this.isSearching.set(false);
      this.showSuggestions.set(true);
      this.cdr.markForCheck();
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (target && !target.closest('.relative')) {
      this.showSuggestions.set(false);
      this.cdr.markForCheck();
    }
  }

  onInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);

    if (val.trim().length >= 1) {
      this.showSuggestions.set(true);
    } else {
      this.showSuggestions.set(false);
      this.catalogSuggestions.set([]);
    }

    this.searchInput$.next(val);
  }

  onFocus(): void {
    if (this.catalogSuggestions().length > 0 || this.hasMinQuery()) {
      this.showSuggestions.set(true);
      this.cdr.markForCheck();
    }
  }

  selectCatalog(prod: CatalogProductDto): void {
    this.searchCache.clear();
    this.selectProduct.emit(prod);
    this.resetSearch();
  }

  addCustom(): void {
    const query = this.searchQuery().trim();
    if (query) {
      this.searchCache.clear();
      this.createCustom.emit(query);
      this.resetSearch();
    }
  }

  resetSearch(): void {
    this.searchQuery.set('');
    this.showSuggestions.set(false);
    this.catalogSuggestions.set([]);
    this.cdr.markForCheck();
  }
}
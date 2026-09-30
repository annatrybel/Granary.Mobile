import { 
  Component, 
  input, 
  output, 
  inject, 
  signal, 
  computed, 
  HostListener, 
  DestroyRef, 
  ChangeDetectionStrategy 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '../../../../environments/environment';

export interface CatalogProductDto {
  id: string;
  name: string;
  categoryName?: string;
  category?: string;
  defaultUnit?: string;
  imageUrl?: string;
}

@Component({
  selector: 'app-catalog-search-bar',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './catalog-search-bar.component.html',
  styleUrl: './catalog-search-bar.component.scss'
})
export class CatalogSearchBarComponent {
  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);

  placeholder = input<string>('Szukaj lub wpisz własny produkt...');

  selectProduct = output<CatalogProductDto>();
  createCustom = output<string>();

  searchQuery = signal<string>('');
  catalogSuggestions = signal<CatalogProductDto[]>([]);
  isSearching = signal<boolean>(false);
  showSuggestions = signal<boolean>(false);

  hasQuery = computed(() => this.searchQuery().trim().length > 0);
  hasMinQuery = computed(() => this.searchQuery().trim().length >= 2);

  private searchInput$ = new Subject<string>();

  constructor() {
    this.searchInput$.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap(term => {
        const trimmed = term.trim();
        if (trimmed.length < 2) {
          this.catalogSuggestions.set([]);
          this.isSearching.set(false);
          return of([]);
        }
        this.isSearching.set(true);
        const params = new HttpParams().set('query', trimmed);
        return this.http.get<CatalogProductDto[]>(`${environment.apiBaseUrl}/catalog-products`, { params }).pipe(
          catchError(() => of([]))
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(results => {
      this.catalogSuggestions.set(results || []);
      this.isSearching.set(false);
      this.showSuggestions.set(true);
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (target && !target.closest('.search-section-wrapper')) {
      this.showSuggestions.set(false);
    }
  }

  onInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
    this.searchInput$.next(val);
  }

  onFocus(): void {
    if (this.catalogSuggestions().length > 0) {
      this.showSuggestions.set(true);
    }
  }

  selectCatalog(prod: CatalogProductDto): void {
    this.selectProduct.emit(prod);
    this.resetSearch();
  }

  addCustom(): void {
    const query = this.searchQuery().trim();
    if (query) {
      this.createCustom.emit(query);
      this.resetSearch();
    }
  }

  resetSearch(): void {
    this.searchQuery.set('');
    this.showSuggestions.set(false);
    this.catalogSuggestions.set([]);
  }
}
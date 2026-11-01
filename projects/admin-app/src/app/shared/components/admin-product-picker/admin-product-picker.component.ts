import { Component, ChangeDetectionStrategy, inject, output, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { APP_ICONS } from '@granary/shared';
import { AdminProductsService, CatalogProductDto } from '../../../products/services/admin-products.service';

const MIN_QUERY_LENGTH = 2;
const RESULTS_LIMIT = 8;

@Component({
  selector: 'app-admin-product-picker',
  standalone: true,
  imports: [APP_ICONS],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative">
      <div class="flex items-center h-11 bg-neutral-100/60 focus-within:bg-white border border-neutral-200/80 focus-within:border-[#536500] rounded-xl px-3.5 transition-all">
        <svg lucideSearch [size]="16" class="text-neutral-400 shrink-0 mr-2.5 pointer-events-none"></svg>
        <input
          type="text"
          [value]="query()"
          (input)="onInput($event)"
          [placeholder]="placeholder"
          aria-label="Szukaj produktu w katalogu"
          autocomplete="off"
          class="flex-1 min-w-0 bg-transparent border-none outline-none text-xs font-medium text-neutral-900 placeholder:text-neutral-400" />
      </div>

      @if (isOpen()) {
        <ul class="absolute z-10 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-neutral-200 rounded-xl shadow-lg py-1 list-none m-0 p-1">
          @if (isLoading()) {
            <li class="px-3 py-2 text-xs text-neutral-400">Szukam…</li>
          } @else {
            @for (product of results(); track product.id) {
              <li>
                <button type="button" (click)="select(product)"
                  class="w-full text-left px-3 py-2 rounded-lg hover:bg-neutral-100 flex items-center justify-between gap-3 cursor-pointer border-none bg-transparent">
                  <span class="text-xs font-bold text-neutral-900 truncate">{{ product.name }}</span>
                  <span class="text-[11px] text-neutral-400 shrink-0">{{ product.categoryName }}</span>
                </button>
              </li>
            } @empty {
              <li class="px-3 py-2 text-xs text-neutral-400">Brak produktów w katalogu.</li>
            }
          }
        </ul>
      }
    </div>
  `
})
export class AdminProductPickerComponent {
  private readonly productsService = inject(AdminProductsService);

  readonly placeholder = 'Dodaj składnik – wpisz nazwę produktu…';

  readonly selected = output<CatalogProductDto>();

  readonly query = signal('');
  readonly results = signal<CatalogProductDto[]>([]);
  readonly isOpen = signal(false);
  readonly isLoading = signal(false);

  private readonly queries$ = new Subject<string>();

  constructor() {
    this.queries$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        tap(q => {
          const shouldSearch = q.length >= MIN_QUERY_LENGTH;
          this.isOpen.set(shouldSearch);
          this.isLoading.set(shouldSearch);
        }),
        switchMap(q =>
          q.length < MIN_QUERY_LENGTH
            ? of(null)
            : this.productsService.getProducts(1, RESULTS_LIMIT, q).pipe(catchError(() => of(null)))
        ),
        takeUntilDestroyed(inject(DestroyRef))
      )
      .subscribe(page => {
        this.results.set(page?.items ?? []);
        this.isLoading.set(false);
      });
  }

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.query.set(value);
    this.queries$.next(value.trim());
  }

  select(product: CatalogProductDto): void {
    this.selected.emit(product);
    this.query.set('');
    this.results.set([]);
    this.isOpen.set(false);
    this.queries$.next('');
  }
}

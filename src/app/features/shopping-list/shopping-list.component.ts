import { 
  Component, 
  signal, 
  computed, 
  inject, 
  OnInit, 
  ChangeDetectionStrategy, 
  HostListener, 
  DestroyRef 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ConfirmDeleteModalComponent } from '../../shared/components/confirm-delete-modal/confirm-delete-modal.component';
import { 
  ShoppingListService, 
  ShoppingListDto, 
  ShoppingItemDto 
} from '../../core/services/shopping-list.service';
import { PantryService } from '../../core/services/pantry.service';
import { ProductItem } from '../../core/db/app-database';
import { environment } from '../../../environments/environment';
import { 
  ShoppingListItem, 
  RestockSuggestion, 
  CatalogProductDto 
} from './models/shopping-list.models';

@Component({
  selector: 'app-shopping-list',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    LucideAngularModule, 
    ConfirmDeleteModalComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shopping-list.component.html',
  styleUrl: './shopping-list.component.scss'
})
export class ShoppingListComponent implements OnInit {
  private shoppingService = inject(ShoppingListService);
  private pantryService = inject(PantryService);
  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);

  isLoading = signal<boolean>(true);
  searchQuery = signal<string>('');
  
  userLists = signal<ShoppingListDto[]>([]);
  currentList = signal<ShoppingListDto | null>(null);
  items = signal<ShoppingListItem[]>([]);

  // Autocomplete katalogu
  catalogSuggestions = signal<CatalogProductDto[]>([]);
  isSearchingCatalog = signal<boolean>(false);
  showSuggestions = signal<boolean>(false);
  private searchInput$ = new Subject<string>();

  // Modale i menu
  isNewListModalOpen = signal<boolean>(false);
  newListName = signal<string>('');
  isOptionsMenuOpen = signal<boolean>(false);
  itemToDelete = signal<ShoppingListItem | null>(null);

  suggestions = computed<RestockSuggestion[]>(() => {
    const products: ProductItem[] = this.pantryService.products() || [];
    const currentListItems = this.items();

    const existingNames = new Set(
      currentListItems.map(item => item.name?.trim().toLowerCase())
    );

    return products
      .filter((p: ProductItem) => {
        if ((p.expiryDays ?? 99) > 7) return false;

        const normalizedName = p.name?.trim().toLowerCase();
        if (existingNames.has(normalizedName)) return false;

        return true;
      })
      .sort((a: ProductItem, b: ProductItem) => (a.expiryDays ?? 0) - (b.expiryDays ?? 0))
      .slice(0, 5)
      .map((p: ProductItem): RestockSuggestion => ({
        id: p.id,
        name: p.name,
        categoryName: p.categoryName || (p as any).category || 'Spiżarnia',
        locationName: p.locationName || 'Spiżarnia',
        quantityDesc: `${p.quantity || 1} ${p.unit || 'szt.'}`,
        timeLeftText: (p.expiryDays ?? 0) <= 1 ? 'Zostało 24h' : `Zostało ${p.expiryDays} dni`
      }));
  });

  checkedCount = computed<number>(() => 
    this.items().filter((i: ShoppingListItem) => i.isChecked).length
  );
  
  totalCount = computed<number>(() => 
    this.items().length
  );

  ngOnInit(): void {
    this.pantryService.loadInitialData();
    this.loadLists();
    this.setupCatalogSearch();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (target) {
      if (!target.closest('.search-section-wrapper')) {
        this.showSuggestions.set(false);
      }
      if (!target.closest('.options-menu-wrapper')) {
        this.isOptionsMenuOpen.set(false);
      }
    }
  }

  private setupCatalogSearch(): void {
    this.searchInput$.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap((term: string) => {
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
    ).subscribe((results: CatalogProductDto[]) => {
      this.catalogSuggestions.set(results || []);
      this.isSearchingCatalog.set(false);
      this.showSuggestions.set(true);
    });
  }


  loadLists(selectListId?: string): void {
    this.isLoading.set(true);
    this.shoppingService.getMyLists().subscribe({
      next: (lists: ShoppingListDto[]) => {
        this.userLists.set(lists || []);

        if (lists && lists.length > 0) {
          const target = selectListId 
            ? (lists.find((l: ShoppingListDto) => l.id === selectListId) || lists[0]) 
            : lists[0];
          this.loadListDetails(target.id);
        } else {
          this.shoppingService.createList({ name: 'Główna lista' }).subscribe({
            next: (newList: ShoppingListDto) => {
              this.userLists.set([newList]);
              this.loadListDetails(newList.id);
            },
            error: () => this.isLoading.set(false)
          });
        }
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadListDetails(listId: string): void {
    this.shoppingService.getListDetails(listId).subscribe({
      next: (dto: ShoppingListDto) => {
        this.currentList.set(dto);
        const mappedItems: ShoppingListItem[] = (dto.items || []).map((i: ShoppingItemDto): ShoppingListItem => ({
          id: i.id,
          productId: i.productId || null,
          name: i.productName || i.name || 'Produkt',
          categoryName: i.categoryName || (i as any).category || 'Inne',
          quantity: Number(i.quantity) || 1,
          unit: i.unit || 'szt.',
          isChecked: !!i.isBought
        }));
        this.items.set(mappedItems);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  switchList(list: ShoppingListDto): void {
    if (this.currentList()?.id === list.id) return;
    this.loadListDetails(list.id);
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const value = input ? input.value : '';
    this.searchQuery.set(value);
    this.searchInput$.next(value);
  }

  resetSearch(): void {
    this.searchQuery.set('');
    this.showSuggestions.set(false);
    this.catalogSuggestions.set([]);
  }


  onSelectCatalogSuggestion(prod: CatalogProductDto): void {
    const list = this.currentList();
    if (!list) return;

    const category = prod.categoryName || prod.category || 'Inne';
    const tempId = 'temp-' + Date.now();

    const newItem: ShoppingListItem = {
      id: tempId,
      productId: prod.id,
      name: prod.name,
      categoryName: category,
      quantity: 1,
      unit: prod.defaultUnit || 'szt.',
      isChecked: false
    };

    this.items.update(curr => [newItem, ...curr]);
    this.resetSearch();

    this.shoppingService.addItem(list.id, {
      productId: prod.id,
      productName: prod.name,
      customName: prod.name,
      categoryName: category,
      quantity: 1,
      unit: prod.defaultUnit || 'szt.'
    }).subscribe({
      next: (createdItem: ShoppingItemDto) => {
        if (createdItem?.id) {
          this.items.update(curr => curr.map(it => it.id === tempId ? { ...it, id: createdItem.id } : it));
        }
      },
      error: (err) => {
        console.error('Błąd dodawania pozycji z katalogu:', err);
        this.items.update(curr => curr.filter(it => it.id !== tempId));
      }
    });
  }

  onAddCustomProduct(): void {
    const name = this.searchQuery().trim();
    const list = this.currentList();
    if (!name || !list) return;

    const tempId = 'temp-' + Date.now();
    const newItem: ShoppingListItem = {
      id: tempId,
      name,
      categoryName: 'Własne',
      quantity: 1,
      unit: 'szt.',
      isChecked: false
    };

    this.items.update(curr => [newItem, ...curr]);
    this.resetSearch();

    this.shoppingService.addItem(list.id, {
      customName: name,
      productName: name,
      categoryName: 'Własne',
      quantity: 1,
      unit: 'szt.'
    }).subscribe({
      next: (createdItem: ShoppingItemDto) => {
        if (createdItem?.id) {
          this.items.update(curr => curr.map(it => it.id === tempId ? { ...it, id: createdItem.id } : it));
        }
      },
      error: (err) => {
        console.error('Błąd dodawania własnego produktu:', err);
        this.items.update(curr => curr.filter(it => it.id !== tempId));
      }
    });
  }

  addSuggestionToList(sug: RestockSuggestion): void {
    const list = this.currentList();
    if (!list) return;

    const tempId = 'temp-' + Date.now();
    const newItem: ShoppingListItem = {
      id: tempId,
      name: sug.name,
      categoryName: sug.categoryName,
      quantity: 1,
      unit: 'szt.',
      isChecked: false
    };

    // 1. Natychmiastowe wstawienie do UI (znika też z kafelków dzięki computed)
    this.items.update(curr => [newItem, ...curr]);

    // 2. Wysłanie bez productId (zapobiega błędowi 400 "Produkt z bazy nie istnieje")
    this.shoppingService.addItem(list.id, {
      customName: sug.name,
      productName: sug.name,
      categoryName: sug.categoryName,
      quantity: 1,
      unit: 'szt.'
    }).subscribe({
      next: (createdItem: ShoppingItemDto) => {
        if (createdItem?.id) {
          this.items.update(curr => curr.map(it => it.id === tempId ? { ...it, id: createdItem.id } : it));
        }
      },
      error: (err) => {
        console.error('Błąd dodawania pozycji z sugerowanych:', err);
        this.items.update(curr => curr.filter(it => it.id !== tempId));
      }
    });
  }


  toggleCheck(id: string): void {
    const list = this.currentList();
    let isCheckedNewValue = false;

    this.items.update((listItems: ShoppingListItem[]) =>
      listItems.map((item: ShoppingListItem) => {
        if (item.id === id) {
          isCheckedNewValue = !item.isChecked;
          return { ...item, isChecked: isCheckedNewValue };
        }
        return item;
      })
    );

    if (list && !id.startsWith('temp-')) {
      this.shoppingService.updateItem(list.id, id, { isBought: isCheckedNewValue }).subscribe({
        error: (err) => console.error('Błąd synchronizacji statusu kupienia:', err)
      });
    }
  }

  changeQuantity(id: string, delta: number): void {
    const list = this.currentList();
    let updatedQuantity = 1;

    this.items.update((listItems: ShoppingListItem[]) =>
      listItems.map((item: ShoppingListItem) => {
        if (item.id === id) {
          updatedQuantity = Math.max(1, item.quantity + delta);
          return { ...item, quantity: updatedQuantity };
        }
        return item;
      })
    );

    // Synchronizacja ilości w tle
    if (list && !id.startsWith('temp-')) {
      this.shoppingService.updateItem(list.id, id, { quantity: updatedQuantity }).subscribe({
        error: (err) => console.error('Błąd synchronizacji ilości:', err)
      });
    }
  }

  askRemoveItem(item: ShoppingListItem, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.itemToDelete.set(item);
  }

  cancelDelete(): void {
    this.itemToDelete.set(null);
  }

  confirmDelete(): void {
    const item = this.itemToDelete();
    const list = this.currentList();
    if (!item || !list) return;

    // Natychmiastowe usunięcie z UI
    this.items.update(l => l.filter(i => i.id !== item.id));
    this.itemToDelete.set(null);

    if (!item.id.startsWith('temp-')) {
      this.shoppingService.deleteItem(list.id, item.id).subscribe({
        error: (err: any) => console.error('Błąd usuwania pozycji:', err)
      });
    }
  }


  toggleOptionsMenu(event: Event): void {
    event.stopPropagation();
    this.isOptionsMenuOpen.update(v => !v);
  }

  shareList(): void {
    this.isOptionsMenuOpen.set(false);
    const list = this.currentList();
    if (!list) return;

    const textLines = this.items().map((i: ShoppingListItem) => `• ${i.name} (${i.quantity} ${i.unit})`).join('\n');
    const shareText = `Lista zakupów: ${list.name || 'Granary'}\n\n${textLines}`;

    if (navigator.share) {
      navigator.share({ title: list.name || 'Lista zakupów', text: shareText }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText);
    }
  }

  clearBoughtItems(): void {
    this.isOptionsMenuOpen.set(false);
    const list = this.currentList();
    const checked = this.items().filter((i: ShoppingListItem) => i.isChecked);
    if (!list || checked.length === 0) return;

    const ids = checked.map((i: ShoppingListItem) => i.id).filter(id => !id.startsWith('temp-'));
    this.items.update(l => l.filter(i => !i.isChecked));

    if (ids.length > 0) {
      this.shoppingService.deleteSelectedItems(list.id, ids).subscribe({
        error: (err: any) => console.error('Błąd czyszczenia kupionych:', err)
      });
    }
  }

  deleteCurrentList(): void {
    this.isOptionsMenuOpen.set(false);
    const list = this.currentList();
    if (!list) return;

    if (confirm(`Czy na pewno chcesz usunąć listę "${list.name}"?`)) {
      this.shoppingService.deleteList(list.id).subscribe({
        next: () => this.loadLists(),
        error: (err: any) => console.error('Błąd usuwania listy:', err)
      });
    }
  }

  moveBoughtToPantry(): void {
    const list = this.currentList();
    const checked = this.items().filter((i: ShoppingListItem) => i.isChecked);
    if (!list || checked.length === 0) return;

    const itemIds = checked.map((i: ShoppingListItem) => i.id).filter(id => !id.startsWith('temp-'));

    this.shoppingService.bulkTransfer(list.id, {
      itemIds,
      destinationLocation: 'Pantry'
    }).subscribe({
      next: () => {
        this.loadListDetails(list.id);
        this.pantryService.loadInitialData();
      },
      error: (err: any) => console.error('Błąd transferu do spiżarni:', err)
    });
  }

  openNewListModal(): void {
    this.newListName.set('');
    this.isNewListModalOpen.set(true);
  }

  closeNewListModal(): void {
    this.isNewListModalOpen.set(false);
  }

  confirmCreateList(): void {
    const name = this.newListName().trim();
    if (!name) return;

    this.shoppingService.createList({ name }).subscribe({
      next: (newList: ShoppingListDto) => {
        this.closeNewListModal();
        const createdId = newList?.id;
        this.loadLists(createdId);
      },
      error: (err: any) => console.error('Błąd tworzenia listy:', err)
    });
  }
}
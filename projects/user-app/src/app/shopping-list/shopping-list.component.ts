import { 
  Component, 
  signal, 
  computed, 
  inject, 
  OnInit, 
  OnDestroy,
  effect,
  untracked,
  ChangeDetectionStrategy, 
  HostListener 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ShoppingListService } from '../core/services/shopping-list.service';
import { PantryService } from '../core/services/pantry.service';
import { SyncService } from '../core/services/sync.service';
import { 
  TranslationService, 
  APP_ICONS, 
  TranslatePipe, 
  ConfirmDeleteModalComponent,
  ShoppingListItem, 
  RestockSuggestion, 
  CatalogProductDto, 
  ShoppingListDto, 
  ShoppingItemDto 
} from '@granary/shared';
import { ProductItem } from '../core/db/app-database';
import { CatalogSearchBarComponent } from '../shared/components/catalog-search-bar/catalog-search-bar.component';
import { RestockSuggestionsComponent } from './components/restock-suggestions/restock-suggestions.component';
import { ShoppingItemCardComponent } from './components/shopping-item-card/shopping-item-card.component';

@Component({
  selector: 'app-shopping-list',
  standalone: true,
  imports: [
    CommonModule,
    ConfirmDeleteModalComponent,
    CatalogSearchBarComponent,
    RestockSuggestionsComponent,
    ShoppingItemCardComponent,
    TranslatePipe,
    APP_ICONS,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shopping-list.component.html',
  styleUrl: './shopping-list.component.scss'
})
export class ShoppingListComponent implements OnInit, OnDestroy {
  private readonly shoppingService = inject(ShoppingListService);
  private readonly pantryService = inject(PantryService);
  private readonly syncService = inject(SyncService);
  protected readonly translationService = inject(TranslationService);

  private isFirstLangRun = true;
  private isFirstSyncRun = true;
  private listsSub?: Subscription;
  private detailsSub?: Subscription;

  readonly isLoading = signal<boolean>(true);
  readonly userLists = signal<ShoppingListDto[]>([]);
  readonly currentList = signal<ShoppingListDto | null>(null);
  readonly items = signal<ShoppingListItem[]>([]);

  readonly isNewListModalOpen = signal<boolean>(false);
  readonly newListName = signal<string>('');
  readonly isOptionsMenuOpen = signal<boolean>(false);
  readonly itemToDelete = signal<ShoppingListItem | null>(null);
  readonly listToDelete = signal<ShoppingListDto | null>(null);

  readonly suggestions = computed<RestockSuggestion[]>(() => {
    const products: ProductItem[] = this.pantryService.products() || [];
    const existingNames = new Set(this.items().map(i => i.name?.trim().toLowerCase()));

    const hours24Text = this.translationService.translate('dashboard.hours24', 'Zostało 24h');
    const leftText = this.translationService.translate('dashboard.leftPrefix', 'Zostało');
    const daysText = this.translationService.translate('common.days', 'dni');

    return products
      .filter(p => (p.expiryDays ?? 99) <= 7 && !existingNames.has(p.name?.trim().toLowerCase()))
      .sort((a, b) => (a.expiryDays ?? 0) - (b.expiryDays ?? 0))
      .slice(0, 5)
      .map(p => ({
        id: p.id,
        name: p.name,
        categoryName: p.categoryName || p.category || this.translationService.translate('inventory.locPantry', 'Spiżarnia'),
        locationName: p.locationName || this.translationService.translate('inventory.locPantry', 'Spiżarnia'),
        quantityDesc: `${p.quantity || 1} ${p.unit || 'szt.'}`,
        timeLeftText: (p.expiryDays ?? 0) <= 1 ? hours24Text : `${leftText} ${p.expiryDays} ${daysText}`
      }));
  });

  readonly checkedCount = computed<number>(() => this.items().filter(i => i.isChecked).length);
  readonly totalCount = computed<number>(() => this.items().length);

  constructor() {
    effect(() => {
      this.translationService.currentLang();
      untracked(() => {
        if (this.isFirstLangRun) {
          this.isFirstLangRun = false;
          return;
        }
        const cur = this.currentList();
        cur ? this.loadListDetails(cur.id) : this.loadLists();
      });
    });

    // Reakcja na synchronizację offline (IndexedDB / Cache)
    effect(() => {
      this.syncService.syncVersion();
      untracked(() => {
        if (this.isFirstSyncRun) {
          this.isFirstSyncRun = false;
          return;
        }
        const cur = this.currentList();
        this.shoppingService.getCachedLists().subscribe(lists => this.userLists.set(this.sortLists(lists || [])));
        if (cur) {
          this.shoppingService.getCachedListDetails(cur.id).subscribe(dto => dto && this.applyList(dto));
        }
      });
    });
  }

  ngOnInit(): void {
    this.loadLists();
  }

  ngOnDestroy(): void {
    this.listsSub?.unsubscribe();
    this.detailsSub?.unsubscribe();
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (!(e.target as HTMLElement)?.closest('.options-menu-wrapper')) {
      this.isOptionsMenuOpen.set(false);
    }
  }

  private sortLists(lists: ShoppingListDto[]): ShoppingListDto[] {
    return [...lists].sort((a, b) => (b.isMain ? 1 : 0) - (a.isMain ? 1 : 0) || (a.name || '').localeCompare(b.name || ''));
  }

  loadLists(selectListId?: string): void {
    this.isLoading.set(true);
    let detailsRequestedFor: string | null = null;

    this.listsSub?.unsubscribe();
    this.listsSub = this.shoppingService.getMyLists().subscribe({
      next: rawLists => {
        const lists = this.sortLists(rawLists || []);
        this.userLists.set(lists);

        if (lists.length > 0) {
          const defaultTarget = lists.find(l => l.isMain) || lists[0];
          const target = selectListId ? (lists.find(l => l.id === selectListId) || defaultTarget) : defaultTarget;

          if (target.id !== detailsRequestedFor) {
            detailsRequestedFor = target.id;
            this.loadListDetails(target.id);
          }
        } else {
          const defaultName = this.translationService.translate('shopping.defaultListName', 'Główna lista');
          this.shoppingService.createList({ name: defaultName }).subscribe(newList => {
            this.userLists.set([newList]);
            this.loadListDetails(newList.id);
          });
        }
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadListDetails(listId: string): void {
    this.detailsSub?.unsubscribe();
    this.detailsSub = this.shoppingService.getListDetails(listId).subscribe({
      next: dto => {
        this.applyList(dto);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  private applyList(dto: ShoppingListDto): void {
    this.currentList.set(dto);
    this.items.set((dto.items || []).map((i: ShoppingItemDto) => ({
      id: i.id,
      productId: i.productId || null,
      name: i.productName || i.name || 'Produkt',
      categoryName: i.categoryName || i.category || 'Inne',
      quantity: Number(i.quantity) || 1,
      unit: i.unit || 'szt.',
      isChecked: !!i.isBought
    })));
  }

  switchList(list: ShoppingListDto): void {
    if (this.currentList()?.id !== list.id) {
      this.loadListDetails(list.id);
    }
  }

   private addOptimisticItem(name: string, category: string, quantity = 1, unit = 'szt.', productId?: string | null): void {
    const list = this.currentList();
    const trimmed = name.trim();
    if (!list || !trimmed) return;

    const tempId = `temp-${Date.now()}`;
    const newItem: ShoppingListItem = {
      id: tempId,
      productId: productId || null,
      name: trimmed,
      categoryName: category,
      quantity,
      unit,
      isChecked: false
    };

    this.items.update(curr => [newItem, ...curr]);

    this.shoppingService.addItem(list.id, {
      productId: productId || undefined,
      customName: productId ? undefined : trimmed,
      productName: trimmed,
      categoryName: category,
      quantity,
      unit
    }).subscribe({
      next: res => {
        if (res?.id) {
          this.items.update(c => c.map(it => it.id === tempId ? { ...it, id: res.id } : it));
        }
      },
      error: () => this.items.update(c => c.filter(it => it.id !== tempId))
    });
  }

  onAddCatalog(prod: CatalogProductDto): void {
    this.addOptimisticItem(prod.name, prod.categoryName || prod.category || 'Inne', 1, prod.defaultUnit || 'szt.', prod.id);
  }

  onAddCustom(name: string): void {
    this.addOptimisticItem(name, 'Własne');
  }

  onAddSuggestion(sug: RestockSuggestion): void {
    this.addOptimisticItem(sug.name, sug.categoryName, 1, 'szt.');
  }

  onToggleCheck(id: string): void {
    const list = this.currentList();
    let isChecked = false;
    this.items.update(items => items.map(i => i.id === id ? { ...i, isChecked: (isChecked = !i.isChecked) } : i));

    if (list && !id.startsWith('temp-')) {
      this.shoppingService.updateItem(list.id, id, { isBought: isChecked }).subscribe();
    }
  }

  onChangeQuantity(id: string, delta: number): void {
    const list = this.currentList();
    let qty = 1;
    this.items.update(items => items.map(i => i.id === id ? { ...i, quantity: (qty = Math.max(1, i.quantity + delta)) } : i));

    if (list && !id.startsWith('temp-')) {
      this.shoppingService.updateItem(list.id, id, { quantity: qty }).subscribe();
    }
  }

  askRemoveItem(item: ShoppingListItem, event?: Event): void {
    event?.stopPropagation();
    this.itemToDelete.set(item);
  }

  cancelDelete(): void {
    this.itemToDelete.set(null);
  }

  confirmDelete(): void {
    const item = this.itemToDelete();
    const list = this.currentList();
    if (!item || !list) return;

    this.items.update(l => l.filter(i => i.id !== item.id));
    this.itemToDelete.set(null);

    if (!item.id.startsWith('temp-')) {
      this.shoppingService.deleteItem(list.id, item.id).subscribe();
    }
  }

  toggleOptionsMenu(event: Event): void {
    event.stopPropagation();
    this.isOptionsMenuOpen.update(v => !v);
  }

  async shareList(): Promise<void> {
    this.isOptionsMenuOpen.set(false);
    const list = this.currentList();
    if (!list) return;

    const itemsToShare = this.items().filter(item => !item.isChecked);
    if (itemsToShare.length === 0) {
      alert(this.translationService.translate('shopping.nothingToShare', 'Brak pozycji do kupienia na tej liście!'));
      return;
    }

    const header = this.translationService
      .translate('shopping.shareMessageHeader', '🛒 Lista zakupów: {listName}')
      .replace('{listName}', list.name);
    const summary = this.translationService
      .translate('shopping.shareMessageSummary', 'Łącznie do kupienia: {count}')
      .replace('{count}', String(itemsToShare.length));

    const formattedText = [
      header,
      '',
      ...itemsToShare.map(item => `• ${item.name} (${item.quantity} ${item.unit})`),
      '',
      summary
    ].join('\n');

    if (navigator.share) {
      try {
        await navigator.share({ title: list.name, text: formattedText });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        alert(this.translationService.translate('shopping.shareError', 'Nie udało się udostępnić listy. Spróbuj ponownie.'));
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(formattedText);
      alert(this.translationService.translate('shopping.copiedToClipboard', 'Skopiowano listę do schowka! Możesz wkleić ją w SMS lub WhatsApp.'));
    } catch {
      alert(this.translationService.translate('shopping.copyError', 'Nie udało się skopiować listy do schowka.'));
    }
  }

  clearBoughtItems(): void {
    this.isOptionsMenuOpen.set(false);
    const list = this.currentList();
    const ids = this.items().filter(i => i.isChecked && !i.id.startsWith('temp-')).map(i => i.id);
    this.items.update(l => l.filter(i => !i.isChecked));
    if (list && ids.length) this.shoppingService.deleteSelectedItems(list.id, ids).subscribe();
  }

  moveBoughtToPantry(): void {
    const list = this.currentList();
    const checkedIds = this.items().filter(i => i.isChecked && !i.id.startsWith('temp-')).map(i => i.id);
    if (!list || checkedIds.length === 0) return;

    this.shoppingService.bulkTransfer(list.id, { itemIds: checkedIds, destinationLocation: 'Pantry' }).subscribe(() => {
      this.loadListDetails(list.id);
      this.pantryService.loadInitialData();
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
    this.shoppingService.createList({ name }).subscribe(newList => {
      this.isNewListModalOpen.set(false);
      this.loadLists(newList.id);
    });
  }

  deleteCurrentList(): void {
    this.isOptionsMenuOpen.set(false);
    const list = this.currentList();
    if (list) this.listToDelete.set(list);
  }

  cancelDeleteList(): void {
    this.listToDelete.set(null);
  }

  confirmDeleteList(): void {
    const list = this.listToDelete();
    this.listToDelete.set(null);
    if (list) {
      this.shoppingService.deleteList(list.id).subscribe(() => this.loadLists());
    }
  }
}
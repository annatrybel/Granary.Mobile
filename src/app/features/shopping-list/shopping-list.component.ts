import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

import { ShoppingListService } from '../../core/services/shopping-list.service';
import { PantryService } from '../../core/services/pantry.service';
import { ProductItem } from '../../core/db/app-database';
import { 
  ShoppingListItem, 
  RestockSuggestion, 
  CatalogProductDto, 
  ShoppingListDto, 
  ShoppingItemDto 
} from './models/shopping-list.models';

import { ConfirmDeleteModalComponent } from '../../shared/components/confirm-delete-modal/confirm-delete-modal.component';
import { CatalogSearchBarComponent } from '../../shared/components/catalog-search-bar/catalog-search-bar.component';
import { RestockSuggestionsComponent } from './components/restock-suggestions/restock-suggestions.component';
import { ShoppingItemCardComponent } from './components/shopping-item-card/shopping-item-card.component';

@Component({
  selector: 'app-shopping-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    ConfirmDeleteModalComponent,
    CatalogSearchBarComponent,
    RestockSuggestionsComponent,
    ShoppingItemCardComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shopping-list.component.html',
  styleUrl: './shopping-list.component.scss'
})
export class ShoppingListComponent implements OnInit {
  private shoppingService = inject(ShoppingListService);
  private pantryService = inject(PantryService);

  isLoading = signal<boolean>(true);
  userLists = signal<ShoppingListDto[]>([]);
  currentList = signal<ShoppingListDto | null>(null);
  items = signal<ShoppingListItem[]>([]);

  isNewListModalOpen = signal<boolean>(false);
  newListName = signal<string>('');
  isOptionsMenuOpen = signal<boolean>(false);
  itemToDelete = signal<ShoppingListItem | null>(null);

  suggestions = computed<RestockSuggestion[]>(() => {
    const products: ProductItem[] = this.pantryService.products() || [];
    const existingNames = new Set(this.items().map(i => i.name?.trim().toLowerCase()));

    return products
      .filter(p => (p.expiryDays ?? 99) <= 7 && !existingNames.has(p.name?.trim().toLowerCase()))
      .sort((a, b) => (a.expiryDays ?? 0) - (b.expiryDays ?? 0))
      .slice(0, 5)
      .map(p => ({
        id: p.id,
        name: p.name,
        categoryName: p.categoryName || p.category || 'Spiżarnia',
        locationName: p.locationName || 'Spiżarnia',
        quantityDesc: `${p.quantity || 1} ${p.unit || 'szt.'}`,
        timeLeftText: (p.expiryDays ?? 0) <= 1 ? 'Zostało 24h' : `Zostało ${p.expiryDays} dni`
      }));
  });

  checkedCount = computed<number>(() => this.items().filter(i => i.isChecked).length);
  totalCount = computed<number>(() => this.items().length);

  ngOnInit(): void {
    this.pantryService.loadInitialData();
    this.loadLists();
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (!(e.target as HTMLElement)?.closest('.options-menu-wrapper')) {
      this.isOptionsMenuOpen.set(false);
    }
  }

  loadLists(selectListId?: string): void {
    this.isLoading.set(true);
    this.shoppingService.getMyLists().subscribe({
      next: lists => {
        this.userLists.set(lists || []);
        if (lists && lists.length > 0) {
          const target = selectListId ? (lists.find(l => l.id === selectListId) || lists[0]) : lists[0];
          this.loadListDetails(target.id);
        } else {
          this.shoppingService.createList({ name: 'Główna lista' }).subscribe(newList => {
            this.userLists.set([newList]);
            this.loadListDetails(newList.id);
          });
        }
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadListDetails(listId: string): void {
    this.shoppingService.getListDetails(listId).subscribe({
      next: dto => {
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
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  switchList(list: ShoppingListDto): void {
    if (this.currentList()?.id === list.id) return;
    this.loadListDetails(list.id);
  }


  onAddCatalog(prod: CatalogProductDto): void {
    const list = this.currentList();
    if (!list) return;

    const tempId = 'temp-' + Date.now();
    const category = prod.categoryName || prod.category || 'Inne';

    this.items.update(curr => [
      { id: tempId, productId: prod.id, name: prod.name, categoryName: category, quantity: 1, unit: prod.defaultUnit || 'szt.', isChecked: false },
      ...curr
    ]);

    this.shoppingService.addItem(list.id, {
      productId: prod.id,
      productName: prod.name,
      customName: prod.name,
      categoryName: category,
      quantity: 1,
      unit: prod.defaultUnit || 'szt.'
    }).subscribe({
      next: res => {
        if (res?.id) {
          this.items.update(c => c.map(it => it.id === tempId ? { ...it, id: res.id } : it));
        }
      },
      error: () => this.items.update(c => c.filter(it => it.id !== tempId))
    });
  }

  onAddCustom(name: string): void {
    const list = this.currentList();
    if (!name.trim() || !list) return;

    const tempId = 'temp-' + Date.now();
    this.items.update(curr => [
      { id: tempId, name: name.trim(), categoryName: 'Własne', quantity: 1, unit: 'szt.', isChecked: false },
      ...curr
    ]);

    this.shoppingService.addItem(list.id, {
      customName: name.trim(),
      productName: name.trim(),
      categoryName: 'Własne',
      quantity: 1,
      unit: 'szt.'
    }).subscribe({
      next: res => {
        if (res?.id) {
          this.items.update(c => c.map(it => it.id === tempId ? { ...it, id: res.id } : it));
        }
      },
      error: () => this.items.update(c => c.filter(it => it.id !== tempId))
    });
  }

  onAddSuggestion(sug: RestockSuggestion): void {
    const list = this.currentList();
    if (!list) return;

    const tempId = 'temp-' + Date.now();
    this.items.update(curr => [
      { id: tempId, name: sug.name, categoryName: sug.categoryName, quantity: 1, unit: 'szt.', isChecked: false },
      ...curr
    ]);

    this.shoppingService.addItem(list.id, {
      customName: sug.name,
      productName: sug.name,
      categoryName: sug.categoryName,
      quantity: 1,
      unit: 'szt.'
    }).subscribe({
      next: res => {
        if (res?.id) {
          this.items.update(c => c.map(it => it.id === tempId ? { ...it, id: res.id } : it));
        }
      },
      error: () => this.items.update(c => c.filter(it => it.id !== tempId))
    });
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

  // --- ZARZĄDZANIE LISTAMI I MENU ---

  toggleOptionsMenu(event: Event): void {
    event.stopPropagation();
    this.isOptionsMenuOpen.update(v => !v);
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

  moveBoughtToPantry(): void {
    const list = this.currentList();
    const checkedIds = this.items().filter(i => i.isChecked && !i.id.startsWith('temp-')).map(i => i.id);
    if (!list || checkedIds.length === 0) return;

    this.shoppingService.bulkTransfer(list.id, { itemIds: checkedIds, destinationLocation: 'Pantry' }).subscribe(() => {
      this.loadListDetails(list.id);
      this.pantryService.loadInitialData();
    });
  }

  clearBoughtItems(): void {
    this.isOptionsMenuOpen.set(false);
    const list = this.currentList();
    const ids = this.items().filter(i => i.isChecked && !i.id.startsWith('temp-')).map(i => i.id);
    this.items.update(l => l.filter(i => !i.isChecked));
    if (list && ids.length) this.shoppingService.deleteSelectedItems(list.id, ids).subscribe();
  }

  deleteCurrentList(): void {
    this.isOptionsMenuOpen.set(false);
    const list = this.currentList();
    if (list && confirm(`Czy na pewno chcesz usunąć listę "${list.name}"?`)) {
      this.shoppingService.deleteList(list.id).subscribe(() => this.loadLists());
    }
  }

  shareList(): void {
    this.isOptionsMenuOpen.set(false);
    const list = this.currentList();
    if (!list) return;
    const txt = `Lista: ${list.name}\n\n` + this.items().map(i => `• ${i.name} (${i.quantity} ${i.unit})`).join('\n');
    navigator.share ? navigator.share({ title: list.name, text: txt }).catch(() => {}) : navigator.clipboard.writeText(txt);
  }
}
import { Component, signal, computed, output, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// =========================================================================
// 1. TYPY I INTERFEJSY
// =========================================================================
export type StorageCategory = 'all' | 'lodowka' | 'zamrazarka' | 'spizarnia';

export interface PantryProduct {
  id: string;
  name: string;
  category: StorageCategory;
  locationName: string;
  emoji: string;
  quantity: string;
}

export interface CatalogProduct {
  id: string;
  name: string;
  category: 'Nabiał' | 'Warzywa' | 'Owoce' | 'Mięso' | 'Napoje' | 'Sypkie';
  emoji: string;
  defaultExpiryDays: number;
}

// =========================================================================
// 2. KOMPONENT MODALU DODAWANIA PRODUKTU
// =========================================================================
@Component({
  selector: 'app-add-product-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center transition-opacity"
         (click)="close()">
      
      <div class="w-full max-w-lg bg-[#F8F9FA] rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl transition-all overflow-hidden max-h-[90vh] flex flex-col"
           (click)="$event.stopPropagation()">
        
        <div class="flex items-center justify-between pb-4 border-b border-gray-200 mb-4">
          <div class="flex items-center gap-2">
            @if (step() !== 'SELECT_METHOD') {
              <button (click)="goBack()" class="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-700 active:scale-95">
                <span class="material-symbols-outlined text-lg">arrow_back</span>
              </button>
            }
            <h3 class="font-headline-md text-xl font-extrabold text-[#1C1B1B]">
              @switch (step()) {
                @case ('SELECT_METHOD') { Jak chcesz dodać produkt? }
                @case ('MANUAL_CATALOG') { Wybierz z bazy produktów }
                @case ('CONFIRM_DETAILS') { Doprecyzuj szczegóły }
              }
            </h3>
          </div>
          <button (click)="close()" class="w-8 h-8 rounded-full bg-gray-200/60 flex items-center justify-center text-gray-600 active:scale-95">
            <span class="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        @if (step() === 'SELECT_METHOD') {
          <div class="flex flex-col gap-4 py-2">
            <button (click)="selectCameraMethod()" 
                    class="p-5 bg-white rounded-[24px] shadow-sm border-2 border-transparent hover:border-[#7209B7] flex items-center gap-4 text-left transition-all active:scale-[0.98]">
              <div class="w-14 h-14 rounded-2xl bg-[#7209B7]/10 text-[#7209B7] flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-3xl">photo_camera</span>
              </div>
              <div class="flex flex-col">
                <span class="font-bold text-lg text-[#1C1B1B]">Skanuj aparat / paragon</span>
                <span class="text-xs text-gray-500">Automatyczne rozpoznawanie produktów AI</span>
              </div>
              <span class="material-symbols-outlined text-gray-400 ml-auto">chevron_right</span>
            </button>

            <button (click)="step.set('MANUAL_CATALOG')" 
                    class="p-5 bg-white rounded-[24px] shadow-sm border-2 border-transparent hover:border-[#AACC00] flex items-center gap-4 text-left transition-all active:scale-[0.98]">
              <div class="w-14 h-14 rounded-2xl bg-[#AACC00]/20 text-[#536500] flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-3xl">edit_note</span>
              </div>
              <div class="flex flex-col">
                <span class="font-bold text-lg text-[#1C1B1B]">Wpisz ręcznie / Katalog</span>
                <span class="text-xs text-gray-500">Szybki wybór z gotowej bazy kategorii</span>
              </div>
              <span class="material-symbols-outlined text-gray-400 ml-auto">chevron_right</span>
            </button>
          </div>
        }

        @if (step() === 'MANUAL_CATALOG') {
          <div class="flex flex-col gap-4 overflow-y-auto pr-1">
            <div class="relative w-full">
              <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
              <input type="text" 
                     [ngModel]="searchQuery()" 
                     (ngModelChange)="searchQuery.set($event)"
                     placeholder="Szukaj np. Mleko, Szpinak, Jaja..." 
                     class="w-full pl-11 pr-4 py-3.5 bg-white rounded-2xl border border-gray-200 focus:outline-none focus:border-[#AACC00] text-sm font-medium"/>
            </div>

            <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              @for (cat of categories; track cat) {
                <button (click)="selectedCategory.set(cat)" 
                        class="px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all"
                        [class.bg-[#AACC00]]="selectedCategory() === cat"
                        [class.text-[#1C1B1B]]="selectedCategory() === cat"
                        [class.bg-white]="selectedCategory() !== cat"
                        [class.text-gray-600]="selectedCategory() !== cat">
                  {{ cat }}
                </button>
              }
            </div>

            <div class="flex flex-col gap-2 max-h-[320px] overflow-y-auto">
              @for (prod of filteredProducts(); track prod.id) {
                <div (click)="selectProductFromCatalog(prod)" 
                     class="p-3 bg-white rounded-2xl flex items-center justify-between shadow-sm hover:bg-[#AACC00]/10 cursor-pointer transition-all active:scale-[0.99]">
                  <div class="flex items-center gap-3">
                    <span class="text-2xl p-2 bg-gray-100 rounded-xl">{{ prod.emoji }}</span>
                    <div class="flex flex-col">
                      <span class="font-bold text-sm text-[#1C1B1B]">{{ prod.name }}</span>
                      <span class="text-xs text-gray-500">{{ prod.category }} • domyślnie +{{ prod.defaultExpiryDays }} dni</span>
                    </div>
                  </div>
                  <span class="w-8 h-8 rounded-full bg-[#AACC00]/20 text-[#536500] flex items-center justify-center font-bold text-lg">+</span>
                </div>
              } @empty {
                <div class="p-6 text-center bg-white rounded-2xl flex flex-col items-center gap-2">
                  <span class="text-3xl">✏️</span>
                  <span class="font-bold text-sm">Nie ma w bazie? Dodaj własny:</span>
                  <button (click)="addCustomProduct(searchQuery())" 
                          class="mt-1 px-4 py-2 bg-[#7209B7] text-white rounded-full font-bold text-xs shadow-md">
                    Dodaj "{{ searchQuery() }}"
                  </button>
                </div>
              }
            </div>
          </div>
        }

        @if (step() === 'CONFIRM_DETAILS' && activeProduct()) {
          <div class="flex flex-col gap-5 py-2">
            <div class="p-4 bg-white rounded-2xl flex items-center gap-4 shadow-sm">
              <span class="text-3xl">{{ activeProduct()?.emoji }}</span>
              <div class="flex flex-col">
                <span class="font-bold text-base text-[#1C1B1B]">{{ activeProduct()?.name }}</span>
                <span class="text-xs text-gray-500">Kategoria: {{ activeProduct()?.category }}</span>
              </div>
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-xs font-bold uppercase tracking-wider text-gray-500">Gdzie umieścić?</label>
              <div class="grid grid-cols-3 gap-2">
                <button (click)="selectedLocation.set('Lodówka')" 
                        class="p-3 rounded-2xl font-bold text-xs flex flex-col items-center gap-1 transition-all"
                        [class.bg-[#7209B7]]="selectedLocation() === 'Lodówka'"
                        [class.text-white]="selectedLocation() === 'Lodówka'"
                        [class.bg-white]="selectedLocation() !== 'Lodówka'">
                  <span class="material-symbols-outlined text-lg">kitchen</span> Lodówka
                </button>
                <button (click)="selectedLocation.set('Zamrażarka')" 
                        class="p-3 rounded-2xl font-bold text-xs flex flex-col items-center gap-1 transition-all"
                        [class.bg-[#7209B7]]="selectedLocation() === 'Zamrażarka'"
                        [class.text-white]="selectedLocation() === 'Zamrażarka'"
                        [class.bg-white]="selectedLocation() !== 'Zamrażarka'">
                  <span class="material-symbols-outlined text-lg">ac_unit</span> Zamrażarka
                </button>
                <button (click)="selectedLocation.set('Spiżarnia')" 
                        class="p-3 rounded-2xl font-bold text-xs flex flex-col items-center gap-1 transition-all"
                        [class.bg-[#7209B7]]="selectedLocation() === 'Spiżarnia'"
                        [class.text-white]="selectedLocation() === 'Spiżarnia'"
                        [class.bg-white]="selectedLocation() !== 'Spiżarnia'">
                  <span class="material-symbols-outlined text-lg">shelves</span> Spiżarnia
                </button>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="flex flex-col gap-1">
                <label class="text-xs font-bold uppercase tracking-wider text-gray-500">Ilość</label>
                <div class="flex items-center justify-between p-2 bg-white rounded-2xl shadow-sm">
                  <button (click)="decrementQty()" class="w-8 h-8 rounded-xl bg-gray-100 font-bold active:scale-90">-</button>
                  <span class="font-bold text-sm">{{ quantity() }} szt.</span>
                  <button (click)="incrementQty()" class="w-8 h-8 rounded-xl bg-[#AACC00] font-bold active:scale-90">+</button>
                </div>
              </div>

              <div class="flex flex-col gap-1">
                <label class="text-xs font-bold uppercase tracking-wider text-gray-500">Ważność</label>
                <input type="date" 
                       [ngModel]="expiryDate()" 
                       (ngModelChange)="expiryDate.set($event)"
                       class="p-3 bg-white rounded-2xl font-bold text-xs text-center shadow-sm focus:outline-none"/>
              </div>
            </div>

            <button (click)="submitProduct()" 
                    class="w-full py-4 bg-[#AACC00] text-[#1C1B1B] font-extrabold text-base rounded-2xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2 cursor-pointer">
              <span class="material-symbols-outlined">add_circle</span> Dodaj do zapasów
            </button>
          </div>
        }

      </div>
    </div>
  `
})
export class AddProductModalComponent {
  closeModal = output<void>();
  productAdded = output<any>();

  step = signal<'SELECT_METHOD' | 'MANUAL_CATALOG' | 'CONFIRM_DETAILS'>('SELECT_METHOD');
  searchQuery = signal<string>('');
  selectedCategory = signal<string>('Wszystkie');
  
  activeProduct = signal<CatalogProduct | null>(null);
  selectedLocation = signal<'Lodówka' | 'Zamrażarka' | 'Spiżarnia'>('Lodówka');
  quantity = signal<number>(1);
  expiryDate = signal<string>('');

  categories = ['Wszystkie', 'Nabiał', 'Warzywa', 'Owoce', 'Mięso', 'Napoje', 'Sypkie'];

  catalogProducts: CatalogProduct[] = [
    { id: 'c1', name: 'Mleko 3.2%', category: 'Nabiał', emoji: '🥛', defaultExpiryDays: 7 },
    { id: 'c2', name: 'Ser Żółty Gouda', category: 'Nabiał', emoji: '🧀', defaultExpiryDays: 14 },
    { id: 'c3', name: 'Jaja M/L', category: 'Nabiał', emoji: '🥚', defaultExpiryDays: 21 },
    { id: 'c4', name: 'Świeży Szpinak', category: 'Warzywa', emoji: '🥬', defaultExpiryDays: 5 },
    { id: 'c5', name: 'Pomidorki Cherry', category: 'Warzywa', emoji: '🍅', defaultExpiryDays: 7 },
    { id: 'c6', name: 'Jabłka', category: 'Owoce', emoji: '🍎', defaultExpiryDays: 14 },
    { id: 'c7', name: 'Banany', category: 'Owoce', emoji: '🍌', defaultExpiryDays: 5 },
    { id: 'c8', name: 'Pierś z Kurczaka', category: 'Mięso', emoji: '🍗', defaultExpiryDays: 3 },
    { id: 'c9', name: 'Sok Pomarańczowy', category: 'Napoje', emoji: '🧃', defaultExpiryDays: 10 },
    { id: 'c10', name: 'Mąka Pszenna', category: 'Sypkie', emoji: '🌾', defaultExpiryDays: 180 }
  ];

  filteredProducts = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const cat = this.selectedCategory();

    return this.catalogProducts.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(q);
      const matchesCategory = cat === 'Wszystkie' || p.category === cat;
      return matchesSearch && matchesCategory;
    });
  });

  goBack(): void {
    if (this.step() === 'CONFIRM_DETAILS') {
      this.step.set('MANUAL_CATALOG');
    } else if (this.step() === 'MANUAL_CATALOG') {
      this.step.set('SELECT_METHOD');
    }
  }

  close(): void {
    this.closeModal.emit();
  }

  selectCameraMethod(): void {
    alert('Uruchamianie skanera aparatu AI...');
    this.close();
  }

  selectProductFromCatalog(product: CatalogProduct): void {
    this.activeProduct.set(product);
    this.quantity.set(1);
    
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + product.defaultExpiryDays);
    this.expiryDate.set(targetDate.toISOString().split('T')[0]);

    this.step.set('CONFIRM_DETAILS');
  }

  addCustomProduct(name: string): void {
    const customProd: CatalogProduct = {
      id: 'custom-' + Date.now(),
      name: name || 'Własny produkt',
      category: 'Nabiał',
      emoji: '📦',
      defaultExpiryDays: 7
    };
    this.selectProductFromCatalog(customProd);
  }

  incrementQty(): void {
    this.quantity.update(q => q + 1);
  }

  decrementQty(): void {
    this.quantity.update(q => (q > 1 ? q - 1 : 1));
  }

  submitProduct(): void {
    const newProduct = {
      catalogItem: this.activeProduct(),
      location: this.selectedLocation(),
      quantity: this.quantity(),
      expiryDate: this.expiryDate()
    };

    this.productAdded.emit(newProduct);
    this.close();
  }
}

// =========================================================================
// 3. GŁÓWNY KOMPONENT MAGAZYNU (INVENTORY)
// =========================================================================
@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [AddProductModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.scss'
})
export class InventoryComponent {
  private router = inject(Router);

  isAddModalOpen = signal<boolean>(false);
  selectedCategory = signal<StorageCategory>('all');
  searchQuery = signal<string>('');
  selectedIds = signal<Set<string>>(new Set());

  products = signal<PantryProduct[]>([
    { id: '1', name: 'Tofu', category: 'lodowka', locationName: 'Lodówka', emoji: '🧀', quantity: '1 szt.' },
    { id: '2', name: 'Suszone Pomidory', category: 'spizarnia', locationName: 'Spiżarnia', emoji: '🍅', quantity: '1 słoik' },
    { id: '3', name: 'Mleko owsiane', category: 'lodowka', locationName: 'Lodówka', emoji: '🥛', quantity: '2 szt.' },
    { id: '4', name: 'Mrożona pizza', category: 'zamrazarka', locationName: 'Zamrażarka', emoji: '🍕', quantity: '1 szt.' }
  ]);

  filteredItems = computed(() => {
    const category = this.selectedCategory();
    const query = this.searchQuery().toLowerCase().trim();

    return this.products().filter(item => {
      const matchesCategory = category === 'all' || item.category === category;
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

  openAddModal(): void {
    this.isAddModalOpen.set(true);
  }

  closeAddModal(): void {
    this.isAddModalOpen.set(false);
  }

  onProductAdded(event: any): void {
    if (event.catalogItem) {
      let mappedCategory: StorageCategory = 'lodowka';
      if (event.location === 'Zamrażarka') mappedCategory = 'zamrazarka';
      if (event.location === 'Spiżarnia') mappedCategory = 'spizarnia';

      const newProduct: PantryProduct = {
        id: 'item-' + Date.now(),
        name: event.catalogItem.name,
        category: mappedCategory,
        locationName: event.location,
        emoji: event.catalogItem.emoji,
        quantity: `${event.quantity} szt.`
      };

      this.products.update(items => [newProduct, ...items]);
    }

    this.closeAddModal();
  }

  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  toggleSelect(id: string): void {
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

  setCategory(category: StorageCategory): void {
    this.selectedCategory.set(category);
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  generateRecipe(): void {
    const selectedNames = this.selectedNames();
    this.router.navigate(['/generuj-przepis'], { 
      queryParams: { items: Array.from(this.selectedIds()).join(',') } 
    });
  }
}
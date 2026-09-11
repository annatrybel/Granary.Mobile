import { Component, signal, computed, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface CatalogProduct {
  id: string;
  name: string;
  category: 'Nabiał' | 'Warzywa' | 'Owoce' | 'Mięso' | 'Napoje' | 'Sypkie';
  emoji: string;
  defaultExpiryDays: number;
}

@Component({
  selector: 'app-add-product-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- OVERLAY / TŁO MODALU -->
    <div class="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center transition-opacity"
         (click)="close()">
      
      <!-- BENTO BOTTOM SHEET CONTAINER -->
      <div class="w-full max-w-lg bg-[#F8F9FA] rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl transition-all overflow-hidden max-h-[90vh] flex flex-col"
           (click)="$event.stopPropagation()">
        
        <!-- NAGŁÓWEK MODALU -->
        <div class="flex items-center justify-between pb-4 border-b border-gray-200 mb-4">
          <div class="flex items-center gap-2">
            @if (step() !== 'SELECT_METHOD') {
              <button (click)="goBack()" class="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-700 active:scale-95 cursor-pointer">
                <!-- Ikona wstecz -->
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
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
          <button (click)="close()" class="w-8 h-8 rounded-full bg-gray-200/60 flex items-center justify-center text-gray-600 active:scale-95 cursor-pointer">
            <!-- Ikona zamknięcia (X) -->
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <!-- ================= KROK 1: WYBÓR METODY ================= -->
        @if (step() === 'SELECT_METHOD') {
          <div class="flex flex-col gap-4 py-2">
            
            <!-- OPCJA 1: SKANER APARATU -->
            <button (click)="selectCameraMethod()" 
                    class="p-5 bg-white rounded-[24px] shadow-sm border-2 border-transparent hover:border-[#7209B7] flex items-center gap-4 text-left transition-all active:scale-[0.98] cursor-pointer">
              
              <div class="w-14 h-14 rounded-2xl bg-[#7209B7]/10 text-[#7209B7] flex items-center justify-center shrink-0">
                <!-- Ikona aparatu SVG -->
                <svg class="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"/>
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M9 3 7.17 5H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.17L15 3H9Zm3 14a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"/>
                </svg>
              </div>

              <div class="flex flex-col">
                <span class="font-bold text-lg text-[#1C1B1B]">Skanuj aparat / paragon</span>
                <span class="text-xs text-gray-500">Automatyczne rozpoznawanie produktów AI</span>
              </div>

              <!-- Strzałka w prawo -->
              <svg class="w-5 h-5 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </button>

            <!-- OPCJA 2: WPISZ RĘCZNIE -->
            <button (click)="step.set('MANUAL_CATALOG')" 
                    class="p-5 bg-white rounded-[24px] shadow-sm border-2 border-transparent hover:border-[#AACC00] flex items-center gap-4 text-left transition-all active:scale-[0.98] cursor-pointer">
              
              <div class="w-14 h-14 rounded-2xl bg-[#AACC00]/20 text-[#536500] flex items-center justify-center shrink-0">
                <!-- Ikona edycji/ołówek SVG -->
                <svg class="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
              </div>

              <div class="flex flex-col">
                <span class="font-bold text-lg text-[#1C1B1B]">Wpisz ręcznie / Katalog</span>
                <span class="text-xs text-gray-500">Szybki wybór z gotowej bazy kategorii</span>
              </div>

              <!-- Strzałka w prawo -->
              <svg class="w-5 h-5 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </button>

          </div>
        }

        <!-- ================= KROK 2: WYSZUKIWARKA I KATALOG ================= -->
        @if (step() === 'MANUAL_CATALOG') {
          <div class="flex flex-col gap-4 overflow-y-auto pr-1">
            
            <!-- WYSZUKIWARKA -->
            <div class="relative w-full">
              <!-- Ikona lupy -->
              <svg class="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input type="text" 
                     [ngModel]="searchQuery()" 
                     (ngModelChange)="searchQuery.set($event)"
                     placeholder="Szukaj np. Mleko, Szpinak, Jaja..." 
                     class="w-full pl-11 pr-4 py-3.5 bg-white rounded-2xl border border-gray-200 focus:outline-none focus:border-[#AACC00] text-sm font-medium"/>
            </div>

            <!-- CHIPSY KATEGORII -->
            <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              @for (cat of categories; track cat) {
                <button (click)="selectedCategory.set(cat)" 
                        class="px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer"
                        [class.bg-[#AACC00]]="selectedCategory() === cat"
                        [class.text-[#1C1B1B]]="selectedCategory() === cat"
                        [class.bg-white]="selectedCategory() !== cat"
                        [class.text-gray-600]="selectedCategory() !== cat">
                  {{ cat }}
                </button>
              }
            </div>

            <!-- LISTA PRODUKTÓW Z BAZY -->
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
                          class="mt-1 px-4 py-2 bg-[#7209B7] text-white rounded-full font-bold text-xs shadow-md cursor-pointer">
                    Dodaj "{{ searchQuery() }}"
                  </button>
                </div>
              }
            </div>

          </div>
        }

        <!-- ================= KROK 3: SZCZEGÓŁY DOWIĄZANIA ================= -->
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
                <!-- Lodówka -->
                <button (click)="selectedLocation.set('Lodówka')" 
                        class="p-3 rounded-2xl font-bold text-xs flex flex-col items-center gap-1 transition-all cursor-pointer"
                        [class.bg-[#7209B7]]="selectedLocation() === 'Lodówka'"
                        [class.text-white]="selectedLocation() === 'Lodówka'"
                        [class.bg-white]="selectedLocation() !== 'Lodówka'">
                  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm0 2v6h10V4H7zm0 8v8h10v-8H7zm1-6h2v3H8V6zm0 8h2v4H8v-4z"/></svg> Lodówka
                </button>
                <!-- Zamrażarka -->
                <button (click)="selectedLocation.set('Zamrażarka')" 
                        class="p-3 rounded-2xl font-bold text-xs flex flex-col items-center gap-1 transition-all cursor-pointer"
                        [class.bg-[#7209B7]]="selectedLocation() === 'Zamrażarka'"
                        [class.text-white]="selectedLocation() === 'Zamrażarka'"
                        [class.bg-white]="selectedLocation() !== 'Zamrażarka'">
                  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M22 11h-4.17l3.24-3.24-1.41-1.42L15 11h-2V9l4.66-4.66-1.42-1.41L13 6.17V2h-2v4.17L7.76 2.93 6.34 4.34 11 9v2H9L4.34 6.34 2.93 7.76 6.17 11H2v2h4.17l-3.24 3.24 1.41 1.42L9 13h2v2l-4.66 4.66 1.42 1.41L11 17.83V22h2v-4.17l3.24 3.24 1.41-1.41L13 15v-2h2l4.66 4.66 1.42-1.42L17.83 13H22v-2z"/></svg> Zamrażarka
                </button>
                <!-- Spiżarnia -->
                <button (click)="selectedLocation.set('Spiżarnia')" 
                        class="p-3 rounded-2xl font-bold text-xs flex flex-col items-center gap-1 transition-all cursor-pointer"
                        [class.bg-[#7209B7]]="selectedLocation() === 'Spiżarnia'"
                        [class.text-white]="selectedLocation() === 'Spiżarnia'"
                        [class.bg-white]="selectedLocation() !== 'Spiżarnia'">
                  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 2v3H5V5h14zm-14 7h14v2H5v-2zm0 7v-3h14v3H5z"/></svg> Spiżarnia
                </button>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="flex flex-col gap-1">
                <label class="text-xs font-bold uppercase tracking-wider text-gray-500">Ilość</label>
                <div class="flex items-center justify-between p-2 bg-white rounded-2xl shadow-sm">
                  <button (click)="decrementQty()" class="w-8 h-8 rounded-xl bg-gray-100 font-bold active:scale-90 cursor-pointer">-</button>
                  <span class="font-bold text-sm">{{ quantity() }} szt.</span>
                  <button (click)="incrementQty()" class="w-8 h-8 rounded-xl bg-[#AACC00] font-bold active:scale-90 cursor-pointer">+</button>
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
              <!-- Ikona plusa w kółku -->
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>
              Dodaj do zapasów
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

    console.log('Dodano produkt:', newProduct);
    this.productAdded.emit(newProduct);
    this.close();
  }
}
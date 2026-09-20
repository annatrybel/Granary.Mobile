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
  selector: 'app-add-product-sheet',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sheet-backdrop" (click)="close()">
      <div class="figma-bottom-sheet" (click)="$event.stopPropagation()">
        
        <!-- Pigułka uchwytu (drag handle) -->
        <div class="sheet-handle-bar"></div>

        <!-- Przycisk zamknięcia w prawym górnym rogu -->
        <button type="button" class="sheet-close-btn" (click)="close()" aria-label="Zamknij">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>

        @if (currentView() === 'SELECTION') {
          <!-- NAGŁÓWEK KROKU 1 Z FIGMY -->
          <div class="sheet-header-group">
            <div class="pill-new-product">
              <span>NOWY PRODUKT</span>
            </div>
            <h2 class="sheet-main-title">Dodaj do spiżarni</h2>
            <p class="sheet-main-subtitle">Wybierz wygodny dla siebie sposób wprowadzenia zapasów</p>
          </div>

          <!-- KAFEL 1: SZYBKI SKAN -->
          <article class="option-card" (click)="startScan()">
            <div class="card-icon-bubble bg-green-subtle">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#536500">
                <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"/>
                <path fill-rule="evenodd" clip-rule="evenodd" d="M9 3 7.17 5H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.17L15 3H9Zm3 14a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"/>
              </svg>
            </div>
            <div class="card-text-col">
              <span class="card-tag tag-green">SZYBKI SKAN</span>
              <p class="card-description">
                Skieruj aparat na etykietę, kod kreskowy lub paragon, a aplikacja sama odczyta nazwę i datę.
              </p>
            </div>
          </article>

          <!-- KAFEL 2: KROK PO KROKU -->
          <article class="option-card" (click)="currentView.set('CATALOG')">
            <div class="card-icon-bubble bg-amber-subtle">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#92400E">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
            </div>
            <div class="card-text-col">
              <span class="card-tag tag-amber">KROK PO KROKU</span>
              <p class="card-description">
                Wyszukaj produkt w domowym katalogu lub wprowadź własny artykuł wraz z ilością i datą.
              </p>
            </div>
          </article>
        }

        <!-- WIDOK KATALOGU -->
        @if (currentView() === 'CATALOG') {
          <div class="catalog-view">
            <div class="view-nav-bar">
              <button class="nav-back-btn" (click)="currentView.set('SELECTION')">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
              </button>
              <h3 class="catalog-title">Wybierz z katalogu</h3>
              <div style="width: 18px;"></div>
            </div>

            <input type="text" 
                   [ngModel]="searchQuery()" 
                   (ngModelChange)="searchQuery.set($event)"
                   placeholder="Szukaj np. Mleko, Szpinak, Pomidory..." 
                   class="catalog-search-input"/>

            <div class="catalog-items-list">
              @for (prod of filteredCatalog(); track prod.id) {
                <div class="catalog-row-item" (click)="selectCatalogItem(prod)">
                  <div class="item-left">
                    <span class="item-emoji">{{ prod.emoji }}</span>
                    <div>
                      <span class="item-name">{{ prod.name }}</span>
                      <span class="item-cat">{{ prod.category }}</span>
                    </div>
                  </div>
                  <span class="item-add-plus">+</span>
                </div>
              }
            </div>
          </div>
        }

        <!-- WIDOK POTWIERDZENIA SZCZEGÓŁÓW -->
        @if (currentView() === 'CONFIRM' && activeCatalogItem()) {
          <div class="confirm-view">
            <div class="view-nav-bar">
              <button class="nav-back-btn" (click)="currentView.set('CATALOG')">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
              </button>
              <h3 class="catalog-title">Szczegóły</h3>
              <div style="width: 18px;"></div>
            </div>

            <div class="confirm-header-card">
              <span class="item-emoji">{{ activeCatalogItem()?.emoji }}</span>
              <div>
                <span class="item-name">{{ activeCatalogItem()?.name }}</span>
                <span class="item-cat">{{ activeCatalogItem()?.category }}</span>
              </div>
            </div>

            <span class="field-label">Miejsce przechowywania</span>
            <div class="location-switcher">
              <button (click)="selectedLocation.set('Lodówka')" [class.active]="selectedLocation() === 'Lodówka'">Lodówka</button>
              <button (click)="selectedLocation.set('Zamrażarka')" [class.active]="selectedLocation() === 'Zamrażarka'">Zamrażarka</button>
              <button (click)="selectedLocation.set('Spiżarnia')" [class.active]="selectedLocation() === 'Spiżarnia'">Spiżarnia</button>
            </div>

            <button class="submit-add-btn" (click)="confirmProductAdd()">
              Dodaj do spiżarni
            </button>
          </div>
        }

      </div>
    </div>
  `,
  styles: [`
    .sheet-backdrop {
      position: fixed;
      inset: 0;
      z-index: 110;
      background: rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }

    .figma-bottom-sheet {
      position: relative;
      width: 100%;
      max-width: 480px;
      height: auto;
      max-height: 85vh;
      overflow-y: auto;
      display: flex;
      padding: 32px 20px calc(32px + env(safe-area-inset-bottom, 16px)) 20px;
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
      border-radius: 36px 36px 0 0;
      border-top: 1px solid rgba(255, 255, 255, 0.80);
      background: rgba(255, 255, 255, 0.95);
      box-shadow: 0 -12px 40px 0 rgba(0, 0, 0, 0.15);
      backdrop-filter: blur(20px);
      box-sizing: border-box;
      animation: slideSheet 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .sheet-handle-bar {
      position: absolute;
      top: 12px;
      left: 50%;
      transform: translateX(-50%);
      width: 38px;
      height: 4px;
      border-radius: 9999px;
      background: #D1D5DB;
    }

    .sheet-close-btn {
      position: absolute;
      top: 16px;
      right: 18px;
      width: 28px;
      height: 28px;
      border-radius: 9999px;
      background: #F3F4F6;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #4B5563;
      cursor: pointer;
      transition: background-color 0.15s ease;

      &:active {
        transform: scale(0.95);
        background: #E5E7EB;
      }
    }

    .sheet-header-group {
      display: flex;
      width: 100%;
      max-width: 306px;
      flex-direction: column;
      align-items: flex-start;
      margin-bottom: 4px;
    }

    .pill-new-product {
      display: flex;
      padding: 2px 12px;
      flex-direction: column;
      align-items: flex-start;
      border-radius: 9999px;
      border: 1px solid rgba(252, 211, 77, 0.80);
      background: rgba(254, 243, 199, 0.70);
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
      margin-bottom: 8px;

      span {
        color: #78350F;
        font-family: "Plus Jakarta Sans", sans-serif;
        font-size: 10px;
        font-style: normal;
        font-weight: 800;
        line-height: 15px;
        letter-spacing: 1px;
        text-transform: uppercase;
      }
    }

    .sheet-main-title {
      margin: 0;
      align-self: stretch;
      color: #171717;
      font-family: "Plus Jakarta Sans", sans-serif;
      font-size: 20px;
      font-style: normal;
      font-weight: 800;
      line-height: 28px;
      letter-spacing: -0.5px;
    }

    .sheet-main-subtitle {
      margin: 2px 0 0 0;
      color: #737373;
      font-family: "Plus Jakarta Sans", sans-serif;
      font-size: 12px;
      font-style: normal;
      font-weight: 500;
      line-height: 16px;
    }

    .option-card {
      display: flex;
      padding: 16px;
      align-items: center;
      gap: 14px;
      align-self: stretch;
      border-radius: 20px;
      border: 1px solid rgba(229, 229, 229, 0.90);
      background: rgba(255, 255, 255, 0.95);
      box-shadow: 0 6px 20px 0 rgba(83, 101, 0, 0.04);
      backdrop-filter: blur(12px);
      cursor: pointer;
      box-sizing: border-box;
      transition: transform 0.15s ease;

      &:active {
        transform: scale(0.98);
      }
    }

    .card-icon-bubble {
      width: 42px;
      height: 42px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      &.bg-green-subtle { background: rgba(83, 101, 0, 0.10); }
      &.bg-amber-subtle { background: rgba(146, 64, 14, 0.10); }
    }

    .card-text-col {
      display: flex;
      padding-top: 2px;
      flex-direction: column;
      align-items: flex-start;
      align-self: stretch;
    }

    .card-tag {
      font-family: "Plus Jakarta Sans", sans-serif;
      font-size: 10px;
      font-style: normal;
      font-weight: 800;
      line-height: 15px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 2px;

      &.tag-green { color: #536500; }
      &.tag-amber { color: #92400E; }
    }

    .card-description {
      margin: 0;
      color: #737373;
      font-family: "Plus Jakarta Sans", sans-serif;
      font-size: 11.5px;
      font-style: normal;
      font-weight: 500;
      line-height: 17px;
    }

    .catalog-view, .confirm-view {
      display: flex;
      flex-direction: column;
      width: 100%;
      gap: 10px;
    }
    .view-nav-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      margin-bottom: 2px;
    }
    .catalog-title {
      margin: 0;
      font-family: "Plus Jakarta Sans", sans-serif;
      font-size: 15px;
      font-weight: 700;
      color: #171717;
    }
    .nav-back-btn {
      background: transparent;
      border: none;
      font-size: 16px;
      cursor: pointer;
      color: #454934;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .catalog-search-input {
      width: 100%;
      height: 40px;
      padding: 0 14px;
      border-radius: 12px;
      border: 1px solid #E5E5E5;
      background: #FFFFFF;
      font-family: "Plus Jakarta Sans", sans-serif;
      font-size: 13px;
      box-sizing: border-box;
      outline: none;
    }
    .catalog-items-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 200px;
      overflow-y: auto;
    }
    .catalog-row-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      border-radius: 14px;
      background: #FFFFFF;
      border: 1px solid #E5E5E5;
      cursor: pointer;
    }
    .item-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .item-emoji { font-size: 18px; }
    .item-name {
      display: block;
      font-family: "Plus Jakarta Sans", sans-serif;
      font-size: 12.5px;
      font-weight: 700;
      color: #171717;
    }
    .item-cat {
      font-family: "Plus Jakarta Sans", sans-serif;
      font-size: 10px;
      color: #737373;
    }
    .item-add-plus {
      width: 24px;
      height: 24px;
      border-radius: 9999px;
      background: rgba(83, 101, 0, 0.1);
      color: #536500;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
    }
    .confirm-header-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border-radius: 14px;
      background: #FFFFFF;
      border: 1px solid #E5E5E5;
    }
    .field-label {
      font-family: "Plus Jakarta Sans", sans-serif;
      font-size: 11px;
      font-weight: 700;
      color: #737373;
      text-transform: uppercase;
    }
    .location-switcher {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    .location-switcher button {
      height: 36px;
      border-radius: 12px;
      border: 1px solid #E5E5E5;
      background: #FFFFFF;
      color: #454934;
      font-family: "Plus Jakarta Sans", sans-serif;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;

      &.active {
        background: #536500;
        color: #FFFFFF;
        border-color: #536500;
      }
    }
    .submit-add-btn {
      width: 100%;
      height: 42px;
      border-radius: 12px;
      border: none;
      background: #536500;
      color: #FFFFFF;
      font-family: "Plus Jakarta Sans", sans-serif;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      margin-top: 4px;
    }

    @keyframes slideSheet {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
  `]
})
export class AddProductSheetComponent {
  closeSheet = output<void>();
  productAdded = output<any>();

  currentView = signal<'SELECTION' | 'CATALOG' | 'CONFIRM'>('SELECTION');
  searchQuery = signal<string>('');
  activeCatalogItem = signal<CatalogProduct | null>(null);
  selectedLocation = signal<'Lodówka' | 'Zamrażarka' | 'Spiżarnia'>('Lodówka');

  catalog: CatalogProduct[] = [
    { id: '1', name: 'Mleko 3.2%', category: 'Nabiał', emoji: '🥛', defaultExpiryDays: 7 },
    { id: '2', name: 'Ser Żółty Gouda', category: 'Nabiał', emoji: '🧀', defaultExpiryDays: 14 },
    { id: '3', name: 'Świeży Szpinak', category: 'Warzywa', emoji: '🥬', defaultExpiryDays: 5 },
    { id: '4', name: 'Pomidorki Cherry', category: 'Warzywa', emoji: '🍅', defaultExpiryDays: 7 },
    { id: '5', name: 'Mąka Pszenna', category: 'Sypkie', emoji: '🌾', defaultExpiryDays: 180 }
  ];

  filteredCatalog = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    return this.catalog.filter(p => p.name.toLowerCase().includes(q));
  });

  close(): void {
    this.closeSheet.emit();
  }

  startScan(): void {
    alert('Uruchamianie skanera...');
    this.close();
  }

  selectCatalogItem(item: CatalogProduct): void {
    this.activeCatalogItem.set(item);
    this.currentView.set('CONFIRM');
  }

  confirmProductAdd(): void {
    this.productAdded.emit({
      catalogItem: this.activeCatalogItem(),
      location: this.selectedLocation(),
      quantity: 1
    });
    this.close();
  }
}
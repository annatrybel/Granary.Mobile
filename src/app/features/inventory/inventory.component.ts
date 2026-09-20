import { Component, signal, computed,input, output, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AddProductSheetComponent } from './components/add-product-modal.component'; 

export type StorageCategory = 'all' | 'lodowka' | 'zamrazarka' | 'spizarnia';

export interface PantryProduct {
  id: string;
  name: string;
  category: StorageCategory;
  locationName: string;
  imageUrl: string;
  quantity: string;
  expiryDays: number;
}

// =========================================================================
// MODAL POTWIERDZENIA USUNIĘCIA
// =========================================================================
@Component({
  selector: 'app-confirm-delete-modal',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="delete-overlay" (click)="cancel.emit()">
      <div class="delete-dialog" (click)="$event.stopPropagation()">
        <div class="delete-icon-circle">
          <svg width="18" height="20" viewBox="0 0 12 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.25 13.5C1.8375 13.5 1.48438 13.3531 1.19062 13.0594C0.896875 12.7656 0.75 12.4125 0.75 12V2.25H0V0.75H3.75V0H8.25V0.75H12V2.25H11.25V12C11.25 12.4125 11.1031 12.7656 10.8094 13.0594C10.5156 13.3531 10.1625 13.5 9.75 13.5H2.25ZM9.75 2.25H2.25V12H9.75V2.25ZM3.75 10.5H5.25V3.75H3.75V10.5ZM6.75 10.5H8.25V3.75H6.75V10.5ZM2.25 2.25V12V2.25Z" fill="#BA1A1A"/>
          </svg>
        </div>

        <h3 class="delete-title">Usunąć produkt?</h3>
        <p class="delete-desc">
          Czy na pewno chcesz usunąć <strong class="text-black">"{{ productName() }}"</strong> ze swojej spiżarni?
        </p>

        <div class="delete-actions">
          <button type="button" class="btn-cancel" (click)="cancel.emit()">Anuluj</button>
          <button type="button" class="btn-confirm" (click)="confirm.emit()">Usuń</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .delete-overlay {
      position: fixed;
      inset: 0;
      z-index: 120;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .delete-dialog {
      width: 100%;
      max-width: 320px;
      background: #FFFFFF;
      border-radius: 24px;
      padding: 22px 20px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.18);
      border: 1px solid rgba(229, 229, 229, 0.9);
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .delete-icon-circle {
      width: 48px;
      height: 48px;
      border-radius: 9999px;
      background: #FFDAD6;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;
    }
    .delete-title {
      margin: 0;
      color: #1C1B1B;
      font-family: "Plus Jakarta Sans", sans-serif;
      font-size: 16px;
      font-weight: 700;
    }
    .delete-desc {
      margin: 4px 0 18px 0;
      color: #737373;
      font-family: "Plus Jakarta Sans", sans-serif;
      font-size: 12px;
      font-weight: 500;
    }
    .delete-actions {
      display: flex;
      width: 100%;
      gap: 10px;
    }
    .btn-cancel {
      flex: 1;
      height: 40px;
      border-radius: 9999px;
      border: 1px solid #E5E5E5;
      background: #F6F3F2;
      color: #454934;
      font-family: "Plus Jakarta Sans", sans-serif;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-confirm {
      flex: 1;
      height: 40px;
      border-radius: 9999px;
      border: none;
      background: #BA1A1A;
      color: #FFFFFF;
      font-family: "Plus Jakarta Sans", sans-serif;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
    }
  `]
})
export class ConfirmDeleteModalComponent {
  productName = input<string>('');
  cancel = output<void>();
  confirm = output<void>();
}

// =========================================================================
// GŁÓWNY KOMPONENT INVENTORY
// =========================================================================
@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, AddProductSheetComponent, ConfirmDeleteModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.scss'
})
export class InventoryComponent {
  private router = inject(Router);

  isAddModalOpen = signal<boolean>(false);
  productToDelete = signal<PantryProduct | null>(null);

  selectedCategory = signal<StorageCategory>('all');
  searchQuery = signal<string>('');
  selectedIds = signal<Set<string>>(new Set());

  products = signal<PantryProduct[]>([
    {
      id: '1',
      name: 'Młody Szpinak',
      category: 'lodowka',
      locationName: 'Lodówka',
      imageUrl: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=400&q=80',
      quantity: '1 szt',
      expiryDays: 3
    },
    {
      id: '2',
      name: 'Mleko Owsiane',
      category: 'lodowka',
      locationName: 'Lodówka',
      imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80',
      quantity: '2 szt',
      expiryDays: 2
    },
    {
      id: '3',
      name: 'Suszone Pomidory',
      category: 'spizarnia',
      locationName: 'Spiżarnia',
      imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=400&q=80',
      quantity: '1 szt',
      expiryDays: 14
    },
    {
      id: '4',
      name: 'Tofu Naturalne',
      category: 'lodowka',
      locationName: 'Lodówka',
      imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80',
      quantity: '1 szt',
      expiryDays: 5
    }
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
        imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80',
        quantity: `${event.quantity || 1} szt`,
        expiryDays: 5
      };

      this.products.update(items => [newProduct, ...items]);
    }
    this.closeAddModal();
  }

  askRemoveItem(item: PantryProduct, event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    this.productToDelete.set(item);
  }

  cancelDelete(): void {
    this.productToDelete.set(null);
  }

  confirmDelete(): void {
    const item = this.productToDelete();
    if (item) {
      this.products.update(items => items.filter(p => p.id !== item.id));
      this.selectedIds.update(ids => {
        const copy = new Set(ids);
        copy.delete(item.id);
        return copy;
      });
      this.productToDelete.set(null);
    }
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
    this.router.navigate(['/generuj-przepis'], { 
      queryParams: { items: Array.from(this.selectedIds()).join(',') } 
    });
  }
}
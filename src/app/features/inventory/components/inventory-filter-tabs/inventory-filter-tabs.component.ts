import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StorageCategory } from '../../models/inventory.models';

@Component({
  selector: 'app-inventory-filter-tabs',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="filter-wrapper" aria-label="Kategorie magazynu">
      <div class="filter-pill-container">
        @for (tab of tabs; track tab.key) {
          <button 
            type="button" 
            class="tab-btn" 
            [class.active]="selectedCategory() === tab.key" 
            (click)="selectCategory.emit(tab.key)">
            {{ tab.label }}
          </button>
        }
      </div>
    </nav>
  `,
  styleUrls: ['./inventory-filter-tabs.component.scss']
})
export class InventoryFilterTabsComponent {
  selectedCategory = input.required<StorageCategory>();
  selectCategory = output<StorageCategory>();

  readonly tabs: { key: StorageCategory; label: string }[] = [
    { key: 'all', label: 'Wszystko' },
    { key: 'lodowka', label: 'Lodówka' },
    { key: 'zamrazarka', label: 'Zamrażarka' },
    { key: 'spizarnia', label: 'Spiżarnia' }
  ];
}
import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ShoppingListItem } from '../../models/shopping-list.models';

@Component({
  selector: 'app-shopping-item-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="shopping-card" [class.is-checked]="item().isChecked" (click)="toggle.emit(item().id)">
      <div class="card-left-group">
        <div class="custom-circle-checkbox" [class.checked]="item().isChecked">
          @if (item().isChecked) {
            <lucide-icon name="check" class="w-3.5 h-3.5 text-white"></lucide-icon>
          }
        </div>
        <div class="item-text-column">
          <span class="item-name-title" [class.line-through]="item().isChecked">{{ item().name }}</span>
          <span class="category-badge-pill">{{ item().categoryName }}</span>
        </div>
      </div>

      <div class="card-right-group" (click)="$event.stopPropagation()">
        <div class="quantity-stepper-pill">
          <button type="button" class="stepper-action-btn" (click)="changeQty.emit(-1)">
            <lucide-icon name="minus" class="w-2.5 h-2.5 text-[#404040]"></lucide-icon>
          </button>
          <span class="stepper-value-text">{{ item().quantity }} {{ item().unit }}</span>
          <button type="button" class="stepper-action-btn" (click)="changeQty.emit(1)">
            <lucide-icon name="plus" class="w-2.5 h-2.5 text-[#404040]"></lucide-icon>
          </button>
        </div>
        <button type="button" class="btn-delete-item" (click)="delete.emit()" title="Usuń pozycję">
          <lucide-icon name="trash-2" class="w-3.5 h-3.5 text-[#A3A3A3] hover:text-[#BA1A1A]"></lucide-icon>
        </button>
      </div>
    </article>
  `,
  styleUrls: ['./shopping-item-card.component.scss']
})
export class ShoppingItemCardComponent {
  item = input.required<ShoppingListItem>();
  toggle = output<string>();
  changeQty = output<number>();
  delete = output<void>();
}
import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductItem } from '../../../core/db/app-database';
import { TranslatePipe, APP_ICONS } from '@granary/shared';
import { MediaUrlPipe } from '@granary/shared';


@Component({
  selector: 'app-inventory-card',
  standalone: true,
  imports: [CommonModule, TranslatePipe, MediaUrlPipe, APP_ICONS],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inventory-card.component.html'
})
export class InventoryCardComponent {
  item = input.required<ProductItem>();
  isSelected = input<boolean>(false);

  cardClick = output<ProductItem>();
  toggleSelect = output<void>();
  consumeClick = output<void>();
  wasteClick = output<void>();

  onSelect(event: Event): void {
    event.stopPropagation();
    this.toggleSelect.emit();
  }

  onResolve(event: Event, status: 'consume' | 'waste'): void {
    event.stopPropagation();
    if (status === 'consume') this.consumeClick.emit();
    else this.wasteClick.emit();
  }
}
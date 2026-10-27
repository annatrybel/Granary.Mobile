import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ProductItem } from '../../../core/db/app-database';
import { TranslatePipe } from '@granary/shared';
import { MediaUrlPipe } from '@granary/shared';

@Component({
  selector: 'app-inventory-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule,TranslatePipe, MediaUrlPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inventory-card.component.html'
})
export class InventoryCardComponent {
  item = input.required<ProductItem>();
  isSelected = input<boolean>(false);

  cardClick = output<ProductItem>();
  toggleSelect = output<void>();
  deleteClick = output<void>();

  onSelect(event: Event): void {
    event.stopPropagation();
    this.toggleSelect.emit();
  }

  onDelete(event: Event): void {
    event.stopPropagation();
    this.deleteClick.emit();
  }
}
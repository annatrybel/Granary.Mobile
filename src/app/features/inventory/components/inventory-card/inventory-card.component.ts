import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ProductItem } from '../../../../core/db/app-database';

@Component({
  selector: 'app-inventory-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inventory-card.component.html',
  styleUrl: './inventory-card.component.scss'
})
export class InventoryCardComponent {
  item = input.required<ProductItem>();
  isSelected = input<boolean>(false);

  cardClick = output<ProductItem>();
  toggleSelect = output<Event>();
  deleteClick = output<void>();

  onSelect(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.toggleSelect.emit(event);
  }

  onDelete(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.deleteClick.emit();
  }
}
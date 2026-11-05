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

  onImageError(event: Event): void {
    const image = event.target as HTMLImageElement;
    if (image.dataset['imageSource'] === 'placeholder') return;

    const categoryImageUrl = this.item().categoryImageUrl;
    if (image.dataset['imageSource'] === 'product' && categoryImageUrl) {
      image.dataset['imageSource'] = 'category';
      image.src = categoryImageUrl;
      return;
    }
    image.dataset['imageSource'] = 'placeholder';
    image.dataset['imageSource'] = 'placeholder';
    image.src = '/icons/food-placeholder.svg';
  }

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
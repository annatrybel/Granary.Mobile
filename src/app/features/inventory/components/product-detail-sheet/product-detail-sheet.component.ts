import { Component, input, output, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ProductItem } from '../../../../core/db/app-database';
import { ProductDetailUpdatePayload } from '../../models/inventory.models';
import { PantryService } from '../../../../core/services/pantry.service';

@Component({
  selector: 'app-product-detail-sheet',
  standalone: true,
  imports: [CommonModule, LucideAngularModule], 
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-detail-sheet.component.html',
  styleUrl: './product-detail-sheet.component.scss'
})
export class ProductDetailSheetComponent implements OnInit {
  private readonly pantryService = inject(PantryService);

  product = input.required<ProductItem>();

  closeSheet = output<void>();
  save = output<ProductDetailUpdatePayload & { categoryName?: string }>();

  readonly categories = this.pantryService.categories;

  readonly locationOptions: { key: 'Lodówka' | 'Zamrażarka' | 'Spiżarnia'; icon: string }[] = [
    { key: 'Lodówka', icon: '/icons/fridge.svg' },
    { key: 'Zamrażarka', icon: '/icons/freezer.svg' },
    { key: 'Spiżarnia', icon: '/icons/pantry.svg' }
  ];

  readonly quickDayOptions = [
    { days: 3, label: '+3 dni' },
    { days: 7, label: '+7 dni' },
    { days: 14, label: '+2 tyg' }
  ];

  detailLocation = signal<'Lodówka' | 'Zamrażarka' | 'Spiżarnia'>('Lodówka');
  detailCategoryName = signal<string>('Inne');
  detailQuantity = signal<number>(1);
  detailUnit = signal<string>('szt.');
  detailExpirationDate = signal<string>('');

  get isCustomProduct(): boolean {
    return !this.product().catalogProductId;
  }

  ngOnInit(): void {
    if (this.categories().length === 0) {
      this.pantryService.loadCategories();
    }

    const item = this.product();

    const loc = item.locationName === 'Zamrażarka' 
      ? 'Zamrażarka' 
      : item.locationName === 'Spiżarnia' 
        ? 'Spiżarnia' 
        : 'Lodówka';
    this.detailLocation.set(loc);

    this.detailCategoryName.set(item.categoryName || 'Inne');
    this.detailQuantity.set(Number(item.quantity) || 1);
    this.detailUnit.set(item.unit || 'szt.');

    if (item.expirationDate) {
      this.detailExpirationDate.set(item.expirationDate);
    } else {
      const d = new Date();
      d.setDate(d.getDate() + (item.expiryDays ?? 7));
      this.detailExpirationDate.set(d.toISOString().split('T')[0]);
    }
  }

  changeQuantity(delta: number): void {
    this.detailQuantity.update(q => Math.max(1, q + delta));
  }

  addDaysToExpiry(days: number): void {
    const current = this.detailExpirationDate() 
      ? new Date(this.detailExpirationDate()) 
      : new Date();
    current.setDate(current.getDate() + days);
    this.detailExpirationDate.set(current.toISOString().split('T')[0]);
  }

  onSave(): void {
    this.save.emit({
      locationName: this.detailLocation(),
      quantity: this.detailQuantity(),
      unit: this.detailUnit(),
      expirationDate: this.detailExpirationDate(),
      categoryName: this.detailCategoryName()
    });
  }
}
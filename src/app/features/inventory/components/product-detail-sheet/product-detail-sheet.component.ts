import { Component, input, output, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ProductItem } from '../../../../core/db/app-database';
import { ProductDetailUpdatePayload } from '../../models/inventory.models';

@Component({
  selector: 'app-product-detail-sheet',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-detail-sheet.component.html',
  styleUrl: './product-detail-sheet.component.scss'
})
export class ProductDetailSheetComponent implements OnInit {
  product = input.required<ProductItem>();

  closeSheet = output<void>();
  save = output<ProductDetailUpdatePayload>();

  detailLocation = signal<'Lodówka' | 'Zamrażarka' | 'Spiżarnia'>('Lodówka');
  detailQuantity = signal<number>(1);
  detailUnit = signal<string>('szt.');
  detailExpirationDate = signal<string>('');

  ngOnInit(): void {
    const item = this.product();

    // Lokalizacja
    const loc = item.locationName === 'Zamrażarka' 
      ? 'Zamrażarka' 
      : item.locationName === 'Spiżarnia' 
        ? 'Spiżarnia' 
        : 'Lodówka';
    this.detailLocation.set(loc);

    // Ilość i jednostka
    this.detailQuantity.set(Number(item.quantity) || 1);
    this.detailUnit.set(item.unit || 'szt.');

    // Data ważności (YYYY-MM-DD)
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
      expirationDate: this.detailExpirationDate()
    });
  }
}
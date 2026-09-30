import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ExpiringItem } from '../../models/dashboard.models';

@Component({
  selector: 'app-dashboard-expiring-carousel',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="expiring-carousel-section">
      <div class="expiring-scroll">
        @for (item of items(); track item.id) {
          <article class="expiring-card" [routerLink]="['/magazyn']">
            <div class="card-header-row">
              <div class="warning-circle">
                <img [src]="item.categoryIcon" [alt]="item.categoryName" class="category-icon" />
              </div>

              <div class="time-badge" [class.urgent]="item.daysLeft <= 1">
                <span>{{ item.timeLeftText }}</span>
              </div>
            </div>

            <div class="card-content-block">
              <span class="product-title">{{ item.name }}</span>
              
              <div class="category-row">
                <span class="fridge-icon-wrapper">
                  <img [src]="item.locationIcon" [alt]="item.locationName" />
                </span>
                <span class="category-name">{{ item.locationName }}</span>
              </div>
            </div>
          </article>
        } @empty {
          <div class="no-expiring-box">
            <span class="text-sm font-semibold text-neutral-800">Wszystko świeże! 🎉</span>
            <span class="text-xs text-neutral-500">Żaden produkt nie wygasa w najbliższym czasie.</span>
          </div>
        }
      </div>
    </section>
  `,
  styleUrls: ['./dashboard-expiring-carousel.component.scss']
})
export class DashboardExpiringCarouselComponent {
  items = input.required<ExpiringItem[]>();
}
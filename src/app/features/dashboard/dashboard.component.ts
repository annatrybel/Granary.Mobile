import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

import { PantryService } from '../../core/services/pantry.service';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import { ExpiringItem, StockSection, SuggestedRecipe } from './models/dashboard.models';

import { DashboardHeaderComponent } from './components/dashboard-header/dashboard-header.component';
import { DashboardExpiringCarouselComponent } from './components/dashboard-expiring-carousel/dashboard-expiring-carousel.component';
import { DashboardStockGridComponent } from './components/dashboard-stock-grid/dashboard-stock-grid.component';
import { DashboardRecipeListComponent } from './components/dashboard-recipe-list/dashboard-recipe-list.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    DashboardHeaderComponent,
    DashboardExpiringCarouselComponent,
    DashboardStockGridComponent,
    DashboardRecipeListComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private http = inject(HttpClient);
  private pantryService = inject(PantryService);
  private authService = inject(AuthService);

  userName = signal<string>('UŻYTKOWNIKU');
  private products = this.pantryService.products;

  expiringItems = computed<ExpiringItem[]>(() => {
    return this.products()
      .filter(item => (item.expiryDays ?? 99) <= 4)
      .sort((a, b) => (a.expiryDays ?? 0) - (b.expiryDays ?? 0))
      .slice(0, 5)
      .map(item => {
        const days = item.expiryDays ?? 0;
        let text = `Zostało ${days} dni`;
        if (days <= 0) text = 'Dzisiaj!';
        else if (days === 1) text = 'Zostało 24h';
        else if (days === 2) text = 'Zostało 48h';

        const locName = item.locationName || 'Lodówka';
        const catName = item.categoryName || 'Ogólne';

        return {
          id: item.id,
          name: item.name,
          categoryName: catName,
          categoryIcon: this.getCategoryIcon(catName, item.name),
          locationName: locName,
          locationIcon: this.getLocationIcon(locName, item.storageLocation),
          timeLeftText: text,
          daysLeft: days
        };
      });
  });

  stockSections = computed<StockSection[]>(() => {
    const all = this.products();

    const isFridge = (p: any) => `${p.locationName} ${p.storageLocation} ${p.category}`.toLowerCase().includes('lodów') || `${p.locationName}`.toLowerCase().includes('fridge');
    const isPantry = (p: any) => `${p.locationName} ${p.storageLocation} ${p.category}`.toLowerCase().includes('spiż') || `${p.locationName}`.toLowerCase().includes('pantry');
    const isFreezer = (p: any) => `${p.locationName} ${p.storageLocation} ${p.category}`.toLowerCase().includes('zamraż') || `${p.locationName}`.toLowerCase().includes('freezer');

    return [
      { title: 'Lodówka', count: all.filter(isFridge).length, icon: 'icons/fridge-small.svg', type: 'fridge' },
      { title: 'Spiżarnia', count: all.filter(isPantry).length, icon: 'icons/pantry-shelf.svg', type: 'pantry' },
      { title: 'Zamrażarka', count: all.filter(isFreezer).length, icon: 'icons/freezer-snowflake.svg', type: 'freezer' }
    ];
  });

  recipes = signal<SuggestedRecipe[]>([
    {
      id: 1,
      title: 'Kremowy makaron ze szpinakiem',
      ingredientsUsed: 'Wykorzystasz zapasy z lodówki',
      durationAndPortions: '15 min • 2 porcje',
      imageUrl: 'https://images.unsplash.com/photo-1621996346565-e3d5d628169b?auto=format&fit=crop&w=300&q=80'
    },
    {
      id: 2,
      title: 'Zapiekanka warzywna z serem',
      ingredientsUsed: 'Szybkie czyszczenie lodówki',
      durationAndPortions: '25 min • 3 porcje',
      imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=300&q=80'
    }
  ]);

  ngOnInit(): void {
    this.fetchUserProfile();
  }

  private fetchUserProfile(): void {
    if (!this.authService.isAuthenticated()) return;

    this.http.get<any>(`${environment.apiBaseUrl}/authentication/me`).subscribe({
      next: (user) => {
        const displayName = user.name || user.userName || user.email?.split('@')[0];
        if (displayName) {
          this.userName.set(displayName.toUpperCase());
        }
      },
      error: () => {
        this.userName.set('W KUCHNI');
      }
    });
  }

  private getCategoryIcon(categoryName: string, productName: string): string {
    const cat = `${categoryName} ${productName}`.toLowerCase();

    if (cat.includes('nabia') || cat.includes('dairy') || cat.includes('mlek') || cat.includes('ser')) {
      return 'icons/category-dairy.svg';
    }
    if (cat.includes('pieczyw') || cat.includes('bakery') || cat.includes('chleb') || cat.includes('bułk')) {
      return 'icons/category-bakery.svg';
    }
    if (cat.includes('warz') || cat.includes('owoc') || cat.includes('pomidor') || cat.includes('szpinak') || cat.includes('veggie')) {
      return 'icons/category-veggies.svg';
    }
    if (cat.includes('mięs') || cat.includes('meat') || cat.includes('wędlin') || cat.includes('kurczak')) {
      return 'icons/category-meat.svg';
    }
    if (cat.includes('sypk') || cat.includes('mąk') || cat.includes('ryż') || cat.includes('makaron')) {
      return 'icons/category-pantry.svg';
    }

    return 'icons/warning-drop.svg';
  }

  private getLocationIcon(locationName: string, storageLocation?: string): string {
    const loc = `${locationName} ${storageLocation}`.toLowerCase();

    if (loc.includes('zamraż') || loc.includes('freezer')) {
      return 'icons/freezer-snowflake.svg';
    }
    if (loc.includes('spiż') || loc.includes('pantry')) {
      return 'icons/pantry-shelf.svg';
    }
    return 'icons/fridge-small.svg'; 
  }
}
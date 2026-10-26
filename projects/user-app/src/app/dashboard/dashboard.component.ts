import {
  Component,
  signal,
  computed,
  inject,
  OnInit,
  effect,
  untracked,
  DestroyRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { PantryService } from '@granary/user-app/core/services/pantry.service';
import { AuthService } from '@granary/shared';
import { RecipeService } from '@granary/user-app/core/services/recipe.service';
import { TranslationService } from '@granary/shared';
import { ExpiringItem, StockSection } from './models/dashboard.models';
import { RecipeMatchDto } from '@granary/shared';
import { TranslatePipe } from '@granary/shared';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    LucideAngularModule,
    TranslatePipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  private readonly pantryService = inject(PantryService);
  private readonly authService = inject(AuthService);
  private readonly recipeService = inject(RecipeService);
  protected readonly translationService = inject(TranslationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  userName = computed(() => {
    const user = this.authService.currentUser();
    const name = user?.name || user?.userName || (user?.email ? user.email.split('@')[0] : '');
    return name ? name.toUpperCase() : this.translationService.translate('dashboard.defaultUser', 'W KUCHNI');
  });

  expiringItems = signal<ExpiringItem[]>([]);
  recipes = signal<RecipeMatchDto[]>([]);
  isLoadingRecipes = signal<boolean>(true);

  private readonly products = this.pantryService.products;

  stockSections = computed<StockSection[]>(() => {
    const all = this.products();
    const isFridge = (p: any) => p.storageLocation === 0 || `${p.locationName}`.toLowerCase().includes('lodów') || `${p.locationName}`.toLowerCase().includes('fridge');
    const isPantry = (p: any) => p.storageLocation === 1 || `${p.locationName}`.toLowerCase().includes('spiż') || `${p.locationName}`.toLowerCase().includes('pantry');
    const isFreezer = (p: any) => p.storageLocation === 2 || `${p.locationName}`.toLowerCase().includes('zamraż') || `${p.locationName}`.toLowerCase().includes('freezer');

    return [
      {
        title: this.translationService.translate('inventory.locFridge', 'Lodówka'),
        count: all.filter(isFridge).length,
        icon: '/icons/fridge.svg',
        type: 'fridge'
      },
      {
        title: this.translationService.translate('inventory.locPantry', 'Spiżarnia'),
        count: all.filter(isPantry).length,
        icon: '/icons/pantry.svg',
        type: 'pantry'
      },
      {
        title: this.translationService.translate('inventory.locFreezer', 'Zamrażarka'),
        count: all.filter(isFreezer).length,
        icon: '/icons/freezer.svg',
        type: 'freezer'
      }
    ];
  });

  private isFirstLangRun = true;

  constructor() {
    effect(() => {
      this.translationService.currentLang();
      untracked(() => {
        if (this.isFirstLangRun) {
          this.isFirstLangRun = false;
          return;
        }
        this.loadExpiringItems();
        this.loadZeroWasteRecipes();
      });
    });
  }

  ngOnInit(): void {
    this.loadExpiringItems();
    this.loadZeroWasteRecipes();
  }

  private loadExpiringItems(): void {
    this.pantryService.getExpiringItems(4, 5)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items: any[]) => {
          const mapped: ExpiringItem[] = items.map(dto => ({
            id: dto.id,
            name: dto.productName,
            categoryName: dto.categoryName,
            categoryIcon: dto.categoryImageUrl,
            locationName: this.mapLocationToString(dto.storageLocation),
            locationIcon: this.mapLocationToIcon(dto.storageLocation),
            timeLeftText: this.formatTimeLeft(dto.daysLeft),
            daysLeft: dto.daysLeft,
            productImageUrl: dto.productImageUrl
          }));

          this.expiringItems.set(mapped);
          this.cdr.markForCheck();
        },
        error: (err: unknown) => console.error('Błąd pobierania wygasających produktów:', err)
      });
  }

  private loadZeroWasteRecipes(): void {
    this.isLoadingRecipes.set(true);

    this.recipeService.getRecipes({
      scope: 'all',
      sortBy: 'match',
      page: 1,
      pageSize: 3
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.recipes.set(res?.items ?? []);
          this.isLoadingRecipes.set(false);
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Błąd pobierania przepisów na pulpicie:', err);
          this.isLoadingRecipes.set(false);
          this.cdr.markForCheck();
        }
      });
  }

  private formatTimeLeft(days: number): string {
    if (days <= 0) return this.translationService.translate('dashboard.today', 'Dzisiaj!');
    if (days === 1) return this.translationService.translate('dashboard.hours24', 'Zostało 24h');
    if (days === 2) return this.translationService.translate('dashboard.hours48', 'Zostało 48h');

    const daysLabel = this.translationService.translate('common.days', 'dni');
    const leftLabel = this.translationService.translate('dashboard.leftPrefix', 'Zostało');
    return `${leftLabel} ${days} ${daysLabel}`;
  }

  private mapLocationToString(loc: number): string {
    switch (loc) {
      case 1: return this.translationService.translate('inventory.locPantry', 'Spiżarnia');
      case 2: return this.translationService.translate('inventory.locFreezer', 'Zamrażarka');
      default: return this.translationService.translate('inventory.locFridge', 'Lodówka');
    }
  }

  private mapLocationToIcon(loc: number): string {
    switch (loc) {
      case 1: return '/icons/pantry.svg';
      case 2: return '/icons/freezer.svg';
      default: return '/icons/fridge.svg';
    }
  }
}
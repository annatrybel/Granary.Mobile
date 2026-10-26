import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AdminRecipesService, AdminRecipeItem, AdminRecipeKpis } from './services/admin-recipes.service';
import { ConfirmDeleteModalComponent } from '@granary/shared';
import { AdminSearchBarComponent } from '../shared/components/admin-search-bar/admin-search-bar.component';

@Component({
  selector: 'app-admin-recipes',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    LucideAngularModule,
    ConfirmDeleteModalComponent,
    AdminSearchBarComponent 
  ],
  templateUrl: './admin-recipes.component.html',
  styleUrl: './admin-recipes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminRecipesComponent implements OnInit {
  private readonly recipesService = inject(AdminRecipesService);

  readonly kpis = signal<AdminRecipeKpis | null>(null);
  readonly recipes = signal<AdminRecipeItem[]>([]);
  readonly totalCount = signal(0);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly recipeToDelete = signal<AdminRecipeItem | null>(null);

  readonly searchQuery = signal('');
  readonly selectedMealType = signal('all');
  readonly selectedDiet = signal('all');
  readonly selectedStatus = signal('all');
  readonly pageNumber = signal(1);
  readonly pageSize = signal(10);

  readonly kpiCards = computed(() => {
    const k = this.kpis();
    if (!k) return [];
    return [
      { 
        label: 'Łącznie przepisów', 
        val: k.totalRecipes, 
        sub: `${k.officialRecipes} oficjalnych, ${k.communityRecipes} społeczności`, 
        icon: 'book-open', 
        iconBg: 'bg-emerald-50 text-emerald-700' 
      },
      { 
        label: 'Średnia ocen', 
        val: `${k.averageRating} / 5.0`, 
        sub: `Na bazie ${k.totalReviews} opinii w aplikacji`, 
        icon: 'star', 
        iconBg: 'bg-amber-50 text-amber-600' 
      },
      { 
        label: 'Do weryfikacji', 
        val: k.pendingVerification, 
        sub: 'Nowe propozycje od użytkowników', 
        badge: 'Wymaga decyzji', 
        icon: 'check-circle', 
        iconBg: 'bg-amber-50 text-amber-700' 
      }
    ];
  });

  readonly totalPages = computed(() => Math.ceil(this.totalCount() / this.pageSize()) || 1);

  readonly displayRange = computed(() => {
    const total = this.totalCount();
    if (total === 0) return '0 z 0';
    const start = (this.pageNumber() - 1) * this.pageSize() + 1;
    const end = Math.min(this.pageNumber() * this.pageSize(), total);
    return `${start}–${end} z ${total}`;
  });

  readonly pagesList = computed<(number | string)[]>(() => {
    const total = this.totalPages();
    const current = this.pageNumber();

    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 3) return [1, 2, 3, '...', total];
    if (current >= total - 2) return [1, '...', total - 2, total - 1, total];
    return [1, '...', current, '...', total];
  });

  ngOnInit(): void {
    this.loadKpis();
    this.loadRecipes();
  }

  loadKpis(): void {
    this.recipesService.getKpis().subscribe({
      next: (d) => this.kpis.set(d),
      error: () => this.kpis.set(null)
    });
  }

  loadRecipes(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.recipesService.getRecipes({
      search: this.searchQuery().trim(),
      mealType: this.selectedMealType(),
      diet: this.selectedDiet(),
      status: this.selectedStatus(),
      pageNumber: this.pageNumber(),
      pageSize: this.pageSize()
    }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.recipes.set(res.items || []);
        this.totalCount.set(res.totalCount || 0);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.detail || err?.error?.message || 'Błąd pobierania bazy przepisów.');
      }
    });
  }

  onFilterChange(): void {
    this.pageNumber.set(1);
    this.loadRecipes();
  }

  goToPage(page: number | string): void {
    if (typeof page === 'number' && page !== this.pageNumber() && page >= 1 && page <= this.totalPages()) {
      this.pageNumber.set(page);
      this.loadRecipes();
    }
  }

  nextPage(): void {
    if (this.pageNumber() < this.totalPages()) {
      this.pageNumber.update(p => p + 1);
      this.loadRecipes();
    }
  }

  prevPage(): void {
    if (this.pageNumber() > 1) {
      this.pageNumber.update(p => p - 1);
      this.loadRecipes();
    }
  }

  editRecipe(recipe: AdminRecipeItem): void {
    console.log('Edycja przepisu:', recipe.id, recipe.title);
  }

  askDeleteRecipe(recipe: AdminRecipeItem): void {
    this.recipeToDelete.set(recipe);
  }

  cancelDelete(): void {
    this.recipeToDelete.set(null);
  }

  confirmDelete(): void {
    const target = this.recipeToDelete();
    if (!target) return;

    this.recipesService.deleteRecipe(target.id).subscribe({
      next: () => {
        this.recipes.update(list => list.filter(r => r.id !== target.id));
        this.totalCount.update(c => Math.max(0, c - 1));
        this.recipeToDelete.set(null);
      },
      error: (err) => {
        alert(err?.error?.detail || 'Błąd usuwania przepisu.');
        this.recipeToDelete.set(null);
      }
    });
  }

  exportDatabase(): void {
    console.log('Eksportowanie bazy...');
  }

  openCreateRecipe(): void {
    console.log('Nowy przepis...');
  }

  getCategoryBadgeClass(cat: string): string {
    const map: Record<string, string> = {
      'Wegetariańskie': 'bg-[#BEEB1E]/40 text-[#364900] border-[#BEEB1E]',
      'Śniadanie': 'bg-amber-100/80 text-amber-900 border-amber-200',
      'Wypieki': 'bg-purple-100 text-purple-800 border-purple-200'
    };
    return map[cat] || 'bg-neutral-100 text-neutral-700 border-neutral-200';
  }
}
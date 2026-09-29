import { Component, input, output, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RecipeFilters } from '../../models/recipe.models';

@Component({
  selector: 'app-recipe-filter-sheet',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recipe-filter-sheet.component.html',
  styleUrl: './recipe-filter-sheet.component.scss'
})
export class RecipeFilterSheetComponent implements OnInit {
  filters = input.required<RecipeFilters>();
  filteredCount = input<number>(0);

  closeSheet = output<void>();
  apply = output<RecipeFilters>();
  reset = output<void>();

  availability = signal<'all' | 'ready' | 'missing2'>('all');
  maxTime = signal<number | null>(null);
  sortBy = signal<'match' | 'time'>('match');
  mealType = signal<string | null>(null);
  diet = signal<string | null>(null);

  ngOnInit(): void {
    const f = this.filters();
    this.availability.set(f.availability);
    this.maxTime.set(f.maxTime);
    this.sortBy.set(f.sortBy);
    this.mealType.set(f.mealType);
    this.diet.set(f.diet);
  }

  setMealType(type: string): void {
    this.mealType.update(prev => prev === type ? null : type);
  }

  setDiet(diet: string): void {
    this.diet.update(prev => prev === diet ? null : diet);
  }

  onReset(): void {
    this.availability.set('all');
    this.maxTime.set(null);
    this.sortBy.set('match');
    this.mealType.set(null);
    this.diet.set(null);
    this.reset.emit();
  }

  onApply(): void {
    this.apply.emit({
      availability: this.availability(),
      maxTime: this.maxTime(),
      sortBy: this.sortBy(),
      mealType: this.mealType(),
      diet: this.diet()
    });
    this.closeSheet.emit();
  }
}
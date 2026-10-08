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

  maxTime = signal<number | null>(null);
  sortBy = signal<'match' | 'time' | 'calories' | 'rating'>('match');
  mealType = signal<string | null>(null);
  diet = signal<string | null>(null);

  readonly sortOptions = [
    { id: 'match', label: 'Dopasowanie spiżarni' },
    { id: 'time', label: 'Najkrótszy czas' },
    { id: 'calories', label: 'Najmniej kalorii' },
    { id: 'rating', label: 'Ocena użytkowników' }
  ] as const;

  readonly timeOptions = [
    { val: 15, label: 'do 15 min' },
    { val: 30, label: 'do 30 min' },
    { val: 45, label: 'do 45 min' },
    { val: null, label: 'Dowolny' }
  ] as const;

  readonly mealOptions = ['Śniadanie', 'Obiad', 'Kolacja', 'Przekąska'] as const;
  readonly dietOptions = ['Bez glutenu', 'Bez laktozy', 'Wegańskie', 'Wegetariańskie'] as const;

  ngOnInit(): void {
    const f = this.filters();
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
    this.maxTime.set(null);
    this.sortBy.set('match');
    this.mealType.set(null);
    this.diet.set(null);
    this.reset.emit();
  }

  onApply(): void {
    this.apply.emit({
      maxTime: this.maxTime(),
      sortBy: this.sortBy(),
      mealType: this.mealType(),
      diet: this.diet()
    });
    this.closeSheet.emit();
  }
}
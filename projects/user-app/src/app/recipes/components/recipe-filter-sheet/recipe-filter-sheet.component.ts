import { Component, input, output, signal, viewChild, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { APP_ICONS, DietaryPreference, DIETARY_PREFERENCE_OPTIONS, parseDietaryPreference, RecipeFilters, SwipeToCloseDirective } from '@granary/shared';
import { TranslatePipe } from '@granary/shared';

@Component({
  selector: 'app-recipe-filter-sheet',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, SwipeToCloseDirective, APP_ICONS],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recipe-filter-sheet.component.html',
  styleUrl: './recipe-filter-sheet.component.scss'
})
export class RecipeFilterSheetComponent implements OnInit {
  filters = input.required<RecipeFilters>();
  filteredCount = input<number>(0);
  defaultDiet = input<DietaryPreference>(DietaryPreference.Standard);

  closeSheet = output<void>();
  apply = output<RecipeFilters>();
  reset = output<void>();

  private readonly sheet = viewChild(SwipeToCloseDirective);

  maxTime = signal<number | null>(null);
  sortBy = signal<'match' | 'time' | 'calories' | 'rating'>('match');
  diet = signal<DietaryPreference | null>(null);
  readonly dietOptions = DIETARY_PREFERENCE_OPTIONS;

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

  ngOnInit(): void {
    const f = this.filters();
    this.maxTime.set(f.maxTime);
    this.sortBy.set(f.sortBy);
    this.diet.set(f.diet == null ? this.defaultDiet() : parseDietaryPreference(f.diet));
  }

  setDiet(value: string): void {
    const preference = DIETARY_PREFERENCE_OPTIONS.find(option => option.value === value);
    if (preference) this.diet.set(preference.value);
  }

  onReset(): void {
    this.maxTime.set(null);
    this.sortBy.set('match');
    this.diet.set(this.defaultDiet());
    this.reset.emit();
  }

  onApply(): void {
    this.apply.emit({
      maxTime: this.maxTime(),
      sortBy: this.sortBy(),
      diet: this.diet()
    });
    const sheet = this.sheet();
    if (sheet) sheet.requestClose(); else this.closeSheet.emit();
  }
}
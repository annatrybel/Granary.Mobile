import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from '@granary/shared';

@Component({
  selector: 'app-recipe-search-bar',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="figma-search-section">
      <div class="figma-input-wrapper">
        <lucide-icon name="search" class="w-4.5 h-4.5 text-[#757962] mr-3 shrink-0"></lucide-icon>

        <input 
          type="text" 
          class="figma-text-input" 
          [placeholder]="'recipes.searchPlaceholder' | t:'Szukaj dania lub składnika...'" 
          [value]="searchQuery()"
          (input)="queryChange.emit($any($event.target).value)"
        />

        @if (searchQuery()) {
          <button type="button" class="clear-btn" (click)="queryChange.emit('')">✕</button>
        }

        <button type="button" class="inline-filter-btn" (click)="openFilters.emit()" [title]="'recipeFilters.buttonTooltip' | t:'Filtry'">
          <lucide-icon name="sliders-horizontal" class="w-4 h-4 text-app-brand"></lucide-icon>
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./recipe-search-bar.component.scss']
})
export class RecipeSearchBarComponent {
  searchQuery = input<string>('');
  queryChange = output<string>();
  openFilters = output<void>();
}
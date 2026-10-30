import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe, APP_ICONS } from '@granary/shared';


@Component({
  selector: 'app-recipe-search-bar',
  standalone: true,
  imports: [CommonModule, APP_ICONS, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex h-12 pl-4 pr-1.5 items-center w-full rounded-full border border-app-border bg-app-surface focus-within:border-app-brand shadow-2xs transition-colors box-border">
      <svg lucideSearch [size]="18" class="text-app-muted shrink-0 mr-2.5"></svg>

      <input
        type="text"
        class="flex-1 min-w-0 border-none bg-transparent outline-none text-app-text text-sm font-semibold         placeholder:text-app-muted placeholder:font-normal font-['Plus_Jakarta_Sans',sans-serif]"
        [placeholder]="'recipes.searchPlaceholder' | t:'Szukaj dania lub składnika...'"
        [value]="searchQuery()"
        (input)="queryChange.emit($any($event.target).value)"
      />

      @if (searchQuery()) {
        <button
          type="button"
          class="bg-transparent border-none text-app-muted hover:text-app-text text-xs cursor-pointer p-1 flex items-center justify-center transition-colors"
          (click)="queryChange.emit('')"
          [title]="'search.clearTitle' | t:'Wyczyść'">
          ✕
        </button>
      }

      <button
        type="button"
        class="flex w-9 h-9 justify-center items-center rounded-full bg-app-brand/15 hover:bg-app-brand/25 border-none cursor-pointer shrink-0 ml-1 active:scale-[0.92] transition-all"
        (click)="openFilters.emit()"
        [title]="'recipeFilters.buttonTooltip' | t:'Filtry'">
        <svg lucideSlidersHorizontal [size]="18" class="text-app-brand"></svg>
      </button>
    </div>
  `
})
export class RecipeSearchBarComponent {
  searchQuery = input<string>('');
  queryChange = output<string>();
  openFilters = output<void>();
}
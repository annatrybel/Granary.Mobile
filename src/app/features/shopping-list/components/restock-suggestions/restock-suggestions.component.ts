import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { RestockSuggestion } from '../../models/shopping-list.models';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe'; 

@Component({
  selector: 'app-restock-suggestions',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TranslatePipe], 
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (suggestions().length > 0) {
      <section class="flex flex-col gap-2.5 w-full">
        <h2 class="text-sm font-bold text-app-text leading-5 m-0">
          {{ 'suggestions.title' | t:'Sugerowane do uzupełnienia' }}
        </h2>
        
        <div class="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
          @for (sug of suggestions(); track sug.id) {
            <article class="flex min-w-[205px] p-3.5 flex-col justify-between items-start gap-2.5 rounded-[20px] border border-app-border bg-app-surface shadow-2xs backdrop-blur-md shrink-0">
              
              <div class="flex w-full">
                <span class="inline-flex px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-bold leading-4">
                  {{ sug.timeLeftText }}
                </span>
              </div>

              <div class="flex flex-col gap-0.5">
                <span class="text-sm font-bold text-app-text leading-5">{{ sug.name }}</span>
                <span class="text-[11px] font-medium text-app-muted leading-4">{{ sug.categoryName }} • {{ sug.quantityDesc }}</span>
              </div>

              <button 
                type="button" 
                class="flex py-1 items-center gap-1.5 text-xs font-bold text-app-brand bg-transparent border-none cursor-pointer active:scale-95 transition-transform"
                (click)="add.emit(sug)">
                <lucide-icon name="plus" [size]="14" class="text-app-brand"></lucide-icon>
                <span>{{ 'suggestions.addBtn' | t:'Dodaj do listy' }}</span>
              </button>

            </article>
          }
        </div>
      </section>
    }
  `
})
export class RestockSuggestionsComponent {
  suggestions = input.required<RestockSuggestion[]>();
  add = output<RestockSuggestion>();
}
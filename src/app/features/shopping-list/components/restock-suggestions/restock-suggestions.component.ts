import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { RestockSuggestion } from '../../models/shopping-list.models';

@Component({
  selector: 'app-restock-suggestions',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (suggestions().length > 0) {
      <section class="suggestions-section">
        <h2 class="section-title">Sugerowane do uzupełnienia</h2>
        <div class="suggestions-scroll">
          @for (sug of suggestions(); track sug.id) {
            <article class="suggestion-card">
              <div class="sug-header-row">
                <span class="badge-time-left">{{ sug.timeLeftText }}</span>
              </div>
              <div class="sug-content-block">
                <span class="sug-product-title">{{ sug.name }}</span>
                <span class="sug-location-text">{{ sug.categoryName }} • {{ sug.quantityDesc }}</span>
              </div>
              <button type="button" class="btn-add-to-list" (click)="add.emit(sug)">
                <lucide-icon name="plus" class="w-3.5 h-3.5 text-[#536500]"></lucide-icon>
                <span>Dodaj do listy</span>
              </button>
            </article>
          }
        </div>
      </section>
    }
  `,
  styleUrls: ['./restock-suggestions.component.scss']
})
export class RestockSuggestionsComponent {
  suggestions = input.required<RestockSuggestion[]>();
  add = output<RestockSuggestion>();
}
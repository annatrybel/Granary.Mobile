import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-admin-search-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Kontener typu FLEX - ikona i pole są obok siebie, więc nigdy na siebie nie najdą -->
    <div class="flex items-center h-11 w-full bg-neutral-100/60 hover:bg-neutral-100/90 focus-within:bg-white focus-within:border-[#536500] border border-neutral-200/80 rounded-xl px-3.5 transition-all shadow-2xs">
      
      <!-- Ikonka lupy (zawsze idealnie wycentrowana pionowo z prawej marginesem) -->
      <lucide-icon name="search" [size]="16" class="text-neutral-400 shrink-0 mr-2.5 pointer-events-none" />

      <!-- Pole tekstowe -->
      <input
        type="text"
        [value]="value()"
        (input)="onInput($event)"
        (keyup.enter)="searchSubmit.emit(value())"
        [placeholder]="placeholder()"
        class="flex-1 min-w-0 bg-transparent border-none outline-none text-xs font-medium text-neutral-900 placeholder:text-neutral-400"
      />

      <!-- Przycisk czyszczenia [X] widoczny tylko gdy wpisano tekst -->
      @if (value()) {
        <button
          type="button"
          (click)="clear()"
          title="Wyczyść"
          class="text-neutral-400 hover:text-neutral-700 text-xs font-bold p-1 ml-1 cursor-pointer transition-colors">
          ✕
        </button>
      }

    </div>
  `
})
export class AdminSearchBarComponent {
  value = input<string>('');
  placeholder = input<string>('Szukaj...');

  valueChange = output<string>();
  searchSubmit = output<string>();

  onInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.valueChange.emit(val);
  }

  clear(): void {
    this.valueChange.emit('');
    this.searchSubmit.emit('');
  }
}
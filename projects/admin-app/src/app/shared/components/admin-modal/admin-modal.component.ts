import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { APP_ICONS } from '@granary/shared';

@Component({
  selector: 'app-admin-modal',
  standalone: true,
  imports: [APP_ICONS],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'close.emit()' },
  template: `
    <div
      class="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4"
      (click)="close.emit()">
      <div
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="title()"
        class="w-full bg-white rounded-2xl border border-neutral-200 shadow-2xl flex flex-col max-h-[90vh]"
        [style.max-width.px]="maxWidth()"
        (click)="$event.stopPropagation()">

        <header class="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-neutral-100">
          <div class="min-w-0">
            <h2 class="text-lg font-extrabold text-neutral-900 tracking-tight m-0">{{ title() }}</h2>
            @if (subtitle()) {
              <p class="text-xs text-neutral-500 font-medium mt-1 mb-0">{{ subtitle() }}</p>
            }
          </div>
          <button
            type="button"
            (click)="close.emit()"
            title="Zamknij"
            class="w-8 h-8 shrink-0 rounded-lg text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 flex items-center justify-center transition-colors cursor-pointer">
            <svg lucideX [size]="16"></svg>
          </button>
        </header>

        <div class="overflow-y-auto px-6 py-5">
          <ng-content />
        </div>
      </div>
    </div>
  `
})
export class AdminModalComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly maxWidth = input<number>(480);

  readonly close = output<void>();
}

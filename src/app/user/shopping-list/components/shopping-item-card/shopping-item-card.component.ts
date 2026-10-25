import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ShoppingListItem } from '../../models/shopping-list.models';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe'; 

@Component({
  selector: 'app-shopping-item-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TranslatePipe], 
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article 
      class="flex p-3.5 justify-between items-center w-full rounded-[22px] border border-app-border bg-app-surface shadow-2xs backdrop-blur-md cursor-pointer transition-all active:scale-[0.99]"
      [class.opacity-65]="item().isChecked"
      [class.bg-app-surface-variant/80]="item().isChecked"
      (click)="toggle.emit(item().id)">
      
      <!-- Lewa strona: Checkbox i nazwa -->
      <div class="flex items-center gap-3 min-w-0">
        <div 
          class="w-7 h-7 flex items-center justify-center rounded-full border-2 transition-all shrink-0"
          [class.bg-app-brand]="item().isChecked"
          [class.border-app-brand]="item().isChecked"
          [class.text-white]="item().isChecked"
          [class.border-app-border]="!item().isChecked"
          [class.bg-transparent]="!item().isChecked">
          @if (item().isChecked) {
            <lucide-icon name="check" [size]="14"></lucide-icon>
          }
        </div>

        <div class="flex flex-col gap-0.5 min-w-0">
          <span 
            class="text-sm font-bold leading-5 text-app-text truncate transition-colors"
            [class.line-through]="item().isChecked"
            [class.text-app-muted]="item().isChecked"
            [class.font-normal]="item().isChecked">
            {{ item().name }}
          </span>
          <span class="inline-flex px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold leading-4 self-start">
            {{ item().categoryName }}
          </span>
        </div>
      </div>

      <div class="flex items-center gap-2.5 shrink-0" (click)="$event.stopPropagation()">
        <div class="flex p-0.5 items-center rounded-full border border-app-border bg-app-surface-variant">
          <button 
            type="button" 
            class="w-6 h-6 flex items-center justify-center rounded-full bg-app-surface border border-app-border text-app-text shadow-2xs active:scale-90 transition-transform cursor-pointer"
            (click)="changeQty.emit(-1)"
            aria-label="Zmniejsz">
            <lucide-icon name="minus" [size]="10"></lucide-icon>
          </button>
          
          <span class="text-xs font-bold text-app-text px-2 select-none min-w-12 text-center">
            {{ item().quantity }} {{ item().unit }}
          </span>

          <button 
            type="button" 
            class="w-6 h-6 flex items-center justify-center rounded-full bg-app-surface border border-app-border text-app-text shadow-2xs active:scale-90 transition-transform cursor-pointer"
            (click)="changeQty.emit(1)"
            aria-label="Zwiększ">
            <lucide-icon name="plus" [size]="10"></lucide-icon>
          </button>
        </div>

        <button 
          type="button" 
          class="p-1 flex items-center justify-center text-app-muted hover:text-rose-500 transition-colors cursor-pointer border-none bg-transparent active:scale-90"
          (click)="delete.emit()" 
          [title]="'itemCard.deleteTitle' | t:'Usuń pozycję'">
          <lucide-icon name="trash-2" [size]="15"></lucide-icon>
        </button>
      </div>

    </article>
  `
})
export class ShoppingItemCardComponent {
  item = input.required<ShoppingListItem>();
  toggle = output<string>();
  changeQty = output<number>();
  delete = output<void>();
}
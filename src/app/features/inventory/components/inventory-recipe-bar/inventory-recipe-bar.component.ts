import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-inventory-recipe-bar',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="fixed bottom-6 left-5 right-5 max-w-[560px] mx-auto bg-neutral-900 dark:bg-[#32362A] text-white border border-transparent dark:border-white/10 rounded-[24px] py-2.5 pl-4 pr-3 flex items-center justify-between shadow-[0_12px_30px_rgba(0,0,0,0.35)] z-[100] animate-in fade-in transition-colors">
      <div class="flex items-center gap-3 overflow-hidden">
        <div class="w-7 h-7 rounded-full bg-app-brand text-white flex items-center justify-center text-xs font-bold shrink-0">
          {{ count() }}
        </div>
        <div class="flex flex-col overflow-hidden">
          <span class="text-xs font-bold leading-4">Wybrane produkty</span>
          <span class="text-[10px] text-neutral-400 truncate max-w-[240px]">{{ names() }}</span>
        </div>
      </div>

      <button (click)="generate.emit()" class="w-10 h-10 rounded-full bg-app-brand hover:brightness-110 border-none flex items-center justify-center cursor-pointer shrink-0 active:scale-95 transition-all" title="Generuj przepis">
        <lucide-icon name="sparkles" [size]="16" class="text-white"></lucide-icon>
      </button>
    </aside>
  `
})
export class InventoryRecipeBarComponent {
  count = input.required<number>();
  names = input.required<string>();
  generate = output<void>();
}
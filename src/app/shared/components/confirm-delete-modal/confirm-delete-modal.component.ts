import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-confirm-delete-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-[120] bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in" (click)="cancel.emit()">
      <div class="w-full max-w-[320px] bg-app-surface border border-app-border rounded-[28px] p-6 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95" (click)="$event.stopPropagation()">
        
        <div class="w-12 h-12 rounded-full bg-rose-500/15 flex items-center justify-center mb-3 text-rose-600 dark:text-rose-400">
          <lucide-icon name="trash-2" [size]="20"></lucide-icon>
        </div>

        <h3 class="text-base font-bold text-app-text m-0">Usunąć produkt?</h3>
        
        <p class="text-xs text-app-muted mt-1.5 mb-5 leading-relaxed">
          Czy na pewno chcesz usunąć <strong class="text-app-text font-bold">„{{ productName() }}”</strong> {{ contextText() }}?
        </p>

        <div class="flex w-full gap-2.5">
          <button 
            type="button" 
            class="flex-1 h-10 rounded-full border border-app-border bg-app-surface-variant hover:brightness-95 text-app-text text-xs font-bold transition-all cursor-pointer" 
            (click)="cancel.emit()">
            Anuluj
          </button>
          
          <button 
            type="button" 
            class="flex-1 h-10 rounded-full border-none bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer" 
            (click)="confirm.emit()">
            Usuń
          </button>
        </div>
      </div>
    </div>
  `
})
export class ConfirmDeleteModalComponent {
  productName = input<string>('');
  contextText = input<string>('ze swojej spiżarni'); 

  cancel = output<void>();
  confirm = output<void>();
}
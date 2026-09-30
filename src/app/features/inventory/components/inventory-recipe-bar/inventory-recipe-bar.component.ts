import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-inventory-recipe-bar',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="figma-recipe-bar animate-in fade-in">
      <div class="bar-left-side">
        <div class="selection-count-badge">{{ count() }}</div>
        <div class="selection-text-group">
          <span class="selection-title">Wybrane produkty</span>
          <span class="selection-names">{{ names() }}</span>
        </div>
      </div>

      <button (click)="generate.emit()" class="figma-action-btn" title="Generuj przepis">
        <lucide-icon name="sparkles" class="w-4 h-4 text-white"></lucide-icon>
      </button>
    </aside>
  `,
  styleUrls: ['./inventory-recipe-bar.component.scss']
})
export class InventoryRecipeBarComponent {
  count = input.required<number>();
  names = input.required<string>();
  generate = output<void>();
}
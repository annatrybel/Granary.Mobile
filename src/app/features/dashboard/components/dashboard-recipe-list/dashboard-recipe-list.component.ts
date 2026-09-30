import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { SuggestedRecipe } from '../../models/dashboard.models';

@Component({
  selector: 'app-dashboard-recipe-list',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-recipe-list.component.html',
  styleUrl: './dashboard-recipe-list.component.scss'
})
export class DashboardRecipeListComponent {
  recipes = input.required<SuggestedRecipe[]>();

  readonly fallbackSvg = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' fill='%23F3F4F6' viewBox='0 0 24 24'><rect width='24' height='24' rx='4' fill='%23F3F4F6'/><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z' fill='%239CA3AF'/></svg>";

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.onerror = null; // Zapobiega pętli 404 w konsoli
    img.src = this.fallbackSvg;
  }
}
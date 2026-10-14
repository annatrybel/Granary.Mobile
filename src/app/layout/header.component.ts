import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router, NavigationEnd, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucideAngularModule } from 'lucide-angular'; 
import { TranslatePipe } from '../shared/pipes/translate.pipe';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, LucideAngularModule, TranslatePipe], 
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="fixed top-0 inset-x-0 z-50 bg-app-bg/90 backdrop-blur-md pt-safe border-b border-app-border shadow-2xs transition-colors duration-200">
      <div class="h-16 px-6 sm:px-8 max-w-2xl mx-auto flex items-center justify-between">
        
        <div class="flex items-center gap-3">
          <img 
            src="/icons/logo.svg" 
            alt="Smart Pantry Logo" 
            class="w-10 h-10 aspect-square shrink-0 object-contain"
          />
          <h1 class="m-0 text-app-text text-2xl font-bold leading-8 tracking-tight">
            {{ pageTitleKey() | t:fallbackTitle() }}
          </h1>
        </div>

        <button 
          [routerLink]="['/profil']"
          class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 focus:outline-none cursor-pointer bg-app-surface-variant border border-app-border text-app-text hover:bg-app-surface shadow-2xs" 
          aria-label="Profil użytkownika"
        >
          <lucide-icon name="user" [size]="18" class="text-app-text"></lucide-icon>
        </button>

      </div>
    </header>
  `
})
export class HeaderComponent {
  private readonly router = inject(Router);

  readonly pageTitleKey = signal<string>('header.dashboard');
  readonly fallbackTitle = signal<string>('Pulpit');

  private readonly titlesConfig: Record<string, { key: string; fallback: string }> = {
    '/pulpit': { key: 'header.dashboard', fallback: 'Pulpit' },
    '/magazyn': { key: 'header.inventory', fallback: 'Magazyn' },
    '/przepisy': { key: 'header.recipes', fallback: 'Przepisy' },
    '/zakupy': { key: 'header.shopping', fallback: 'Lista Zakupów' },
    '/skanuj': { key: 'header.scanner', fallback: 'Skaner AI' },
    '/dodaj-recznie': { key: 'header.addManual', fallback: 'Dodaj Produkt' },
    '/generuj-przepis': { key: 'header.generateRecipe', fallback: 'Generuj Przepis' },
    '/profil': { key: 'header.profile', fallback: 'Profil' }
  };

  constructor() {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed()
    ).subscribe((event: NavigationEnd) => {
      this.updateTitleByUrl(event.urlAfterRedirects || event.url);
    });

    this.updateTitleByUrl(this.router.url);
  }

  private updateTitleByUrl(url: string): void {
    const cleanUrl = url.split('?')[0];
    const match = this.titlesConfig[cleanUrl];

    if (match) {
      this.pageTitleKey.set(match.key);
      this.fallbackTitle.set(match.fallback);
    } else {
      this.pageTitleKey.set('header.dashboard');
      this.fallbackTitle.set('Pulpit');
    }
  }
}
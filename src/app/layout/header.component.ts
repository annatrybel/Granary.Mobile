import { Component, inject, signal } from '@angular/core';
import { Router, NavigationEnd, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink], 
  template: `
    <header class="fixed top-0 w-full z-50 bg-[#FCF9F8] pt-safe shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div class="h-16 px-6 sm:px-8 flex items-center justify-between">
        
        <!-- Lewa strona: Logo + Dynamiczny tytuł -->
        <div class="flex items-center gap-3">
          <img 
            src="icons/logo.svg" 
            alt="Smart Pantry Logo" 
            class="w-[40px] h-[40px] aspect-square shrink-0 object-contain"
          />
          <span class="text-[#1C1B1B] font-['Plus_Jakarta_Sans'] text-[24px] font-bold leading-[32px]">
            {{ pageTitle() }}
          </span>
        </div>

        <!-- Prawa strona: Przycisk profilu użytkownika z nawigacją -->
        <button 
          [routerLink]="['/profil']"
          class="w-[40px] h-[40px] shrink-0 transition-transform active:scale-95 focus:outline-none cursor-pointer" 
          aria-label="Profil użytkownika"
        >
          <img src="icons/user.svg" alt="Profil" class="w-[40px] h-[40px] block" />
        </button>

      </div>
    </header>
  `
})
export class HeaderComponent {
  private router = inject(Router);

  pageTitle = signal<string>('Pulpit');

  private readonly titlesMap: Record<string, string> = {
    '/pulpit': 'Pulpit',
    '/magazyn': 'Magazyn',
    '/przepisy': 'Przepisy',
    '/zakupy': 'Lista Zakupów',
    '/skanuj': 'Skaner AI',
    '/dodaj-recznie': 'Dodaj Produkt',
    '/generuj-przepis': 'Generuj Przepis',
    '/profil': 'Profil' 
  };

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.updateTitleByUrl(event.urlAfterRedirects || event.url);
    });

    this.updateTitleByUrl(this.router.url);
  }

  private updateTitleByUrl(url: string): void {
    const cleanUrl = url.split('?')[0];
    const matchedTitle = this.titlesMap[cleanUrl];

    if (matchedTitle) {
      this.pageTitle.set(matchedTitle);
    } else {
      this.pageTitle.set('Pulpit');
    }
  }
}
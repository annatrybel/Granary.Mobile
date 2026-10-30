import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router, NavigationEnd, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe, APP_ICONS } from '@granary/shared';
import { ProfileService } from '@granary/shared';


@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, APP_ICONS, TranslatePipe], 
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="fixed top-0 inset-x-0 z-50 bg-app-bg/90 backdrop-blur-md pt-safe border-b border-app-border shadow-2xs transition-colors duration-200">
      <div class="h-16 px-6 sm:px-8 max-w-2xl mx-auto flex items-center justify-between">
        
        <!-- Logo i Tytuł podstrony -->
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

        <!-- Akcje: Dzwonek Powiadomień + Profil -->
        <div class="flex items-center gap-2">
          
          <!-- Dzwonek Powiadomień -->
          <div class="relative">
            <button 
              type="button" 
              (click)="toggleNotifications($event)"
              class="relative w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 focus:outline-none cursor-pointer bg-app-surface-variant border border-app-border text-app-text hover:bg-app-surface shadow-2xs" 
              aria-label="Powiadomienia"
            >
              <svg lucideBell [size]="18" class="text-app-text" ></svg>

              <!-- Czerwona kropka gdy są nieprzeczytane powiadomienia -->
              @if (profileService.unreadCount() > 0) {
                <span class="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-app-surface animate-pulse"></span>
              }
            </button>

            <!-- Dropdown powiadomień -->
            @if (isNotificationsOpen()) {
              <!-- Tło zamykające dropdown po kliknięciu poza niego -->
              <div class="fixed inset-0 z-40 bg-transparent" (click)="isNotificationsOpen.set(false)"></div>

              <!-- Menu powiadomień -->
              <div 
                class="absolute right-0 top-12 z-50 w-80 max-w-[calc(100vw-2rem)] bg-app-surface border border-app-border rounded-2xl shadow-xl p-3 flex flex-col gap-2 animate-in fade-in zoom-in-95"
                (click)="$event.stopPropagation()">
                
                <div class="flex items-center justify-between pb-2 border-b border-app-border/60">
                  <span class="text-xs font-bold text-app-text">
                    {{ 'notifications.title' | t:'Powiadomienia' }}
                  </span>
                  <span class="text-[10px] font-semibold text-app-muted bg-app-bg px-2 py-0.5 rounded-full border border-app-border">
                    {{ profileService.unreadCount() }} {{ 'notifications.new' | t:'nowe' }}
                  </span>
                </div>

                <div class="flex flex-col gap-2 max-h-64 overflow-y-auto pr-0.5 scrollbar-none">
                  @for (item of profileService.notifications(); track item.id) {
                    <div class="p-2.5 rounded-xl bg-app-bg border border-app-border/60 flex items-center justify-between gap-2.5">
                      <div class="flex flex-col min-w-0">
                        <span class="text-xs font-bold text-app-text truncate">{{ item.productName }}</span>
                        <span class="text-[10.5px] text-app-muted truncate">
                          @if (item.daysRemaining <= 0) {
                            {{ 'notifications.expiresToday' | t:'Kończy się dzisiaj!' }}
                          } @else if (item.daysRemaining === 1) {
                            {{ 'notifications.expiresTomorrow' | t:'Kończy się jutro!' }}
                          } @else {
                            {{ 'notifications.expiresInDays' | t:'Kończy się za' }} {{ item.daysRemaining }} {{ 'common.days' | t:'dni' }}
                          }
                        </span>
                      </div>

                      <button 
                        type="button"
                        (click)="dismissNotification(item.id)"
                        class="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-app-brand text-white border-none cursor-pointer active:scale-95 transition-all">
                        {{ 'common.ok' | t:'OK' }}
                      </button>
                    </div>
                  } @empty {
                    <div class="py-6 flex flex-col items-center justify-center text-center">
                      <svg lucideCircleCheck [size]="24" class="text-app-muted/50 mb-1" ></svg>
                      <span class="text-xs font-medium text-app-muted">
                        {{ 'notifications.empty' | t:'Brak nowych powiadomień' }}
                      </span>
                    </div>
                  }
                </div>
              </div>
            }
          </div>

          <!-- Przycisk Profilu Użytkownika -->
          <button 
            [routerLink]="['/profil']"
            (click)="isNotificationsOpen.set(false)"
            class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 focus:outline-none cursor-pointer bg-app-surface-variant border border-app-border text-app-text hover:bg-app-surface shadow-2xs" 
            aria-label="Profil użytkownika"
          >
            <svg lucideUser [size]="18" class="text-app-text" ></svg>
          </button>

        </div>

      </div>
    </header>
  `
})
export class HeaderComponent implements OnInit {
  private readonly router = inject(Router);
  protected readonly profileService = inject(ProfileService);

  readonly isNotificationsOpen = signal<boolean>(false);
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
      // Zamykamy dropdown po przejściu na inny widok
      this.isNotificationsOpen.set(false);
    });

    this.updateTitleByUrl(this.router.url);
  }

  ngOnInit(): void {
    // Ładujemy powiadomienia raz na starcie nagłówka
    this.profileService.loadNotifications();
  }

  toggleNotifications(event: Event): void {
    event.stopPropagation();
    this.isNotificationsOpen.update(v => !v);
  }

  dismissNotification(id: string): void {
    this.profileService.markNotificationAsRead(id).subscribe();
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
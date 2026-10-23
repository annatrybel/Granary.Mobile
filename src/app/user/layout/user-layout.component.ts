import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header.component';
import { BottomNavComponent } from './bottom-nav.component';

@Component({
  selector: 'app-user-layout',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, BottomNavComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Mobilny nagłówek z powiadomieniami -->
    <app-header />

    <!-- Główna zawartość podstron (odsunięta od nagłówka i dolnego menu) -->
    <main class="min-h-screen pt-16 pb-28">
      <router-outlet />
    </main>

    <!-- Pływające dolne menu nawigacyjne -->
    <app-bottom-nav />
  `
})
export class UserLayoutComponent {}
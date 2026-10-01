import { Component, inject, signal } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { HeaderComponent } from './layout/header.component';
import { BottomNavComponent } from './layout/bottom-nav.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, BottomNavComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private router = inject(Router);

  showNavigation = signal<boolean>(true);

  private readonly hiddenRoutes = ['/auth', '/login', '/profil'];

  constructor() {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.updateNavigationVisibility(event.urlAfterRedirects || event.url);
    });

    this.updateNavigationVisibility(this.router.url);
  }

  private updateNavigationVisibility(url: string): void {
    const cleanUrl = url.split('?')[0];
    const shouldHide = this.hiddenRoutes.some(route => cleanUrl.startsWith(route));
    this.showNavigation.set(!shouldHide);
  }
}
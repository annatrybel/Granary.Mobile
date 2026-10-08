import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '../shared/icon/icon.component';

interface NavTab {
  path: string;
  label: string;
  icon: string;
  exact: boolean;
}

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [IconComponent, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
   
    <nav class="fixed bottom-0 w-full z-[60] pb-safe mb-4 flex justify-center pointer-events-none px-3">
      
      <!-- Pływająca kapsuła -->
      <div class="pointer-events-auto relative w-full max-w-[342px] h-[72px] bg-app-surface/90 backdrop-blur-2xl rounded-full flex items-center justify-between p-2 shadow-xl border border-app-border transition-colors duration-200">
        
        @for (tab of tabs; track tab.path) {
          <a [routerLink]="tab.path" 
             routerLinkActive="active-tab"
             #rla="routerLinkActive"
             [routerLinkActiveOptions]="{ exact: tab.exact }"
             class="relative flex-1 h-[56px] rounded-full flex flex-col items-center justify-center gap-0.5 transition-all duration-300 no-underline cursor-pointer select-none"
             [class.bg-app-brand]="rla.isActive"
             [class.text-white]="rla.isActive"
             [class.shadow-md]="rla.isActive"
             [class.shadow-app-brand/30]="rla.isActive"
             [class.text-app-muted]="!rla.isActive"
             [class.hover:text-app-text]="!rla.isActive">
            
            <app-icon [name]="tab.icon" />
            
            <span class="text-[9px] leading-[11px] tracking-[0.5px] uppercase"
                  [class.font-extrabold]="rla.isActive"
                  [class.font-semibold]="!rla.isActive">
              {{ tab.label }}
            </span>
          </a>
        }

      </div>
    </nav>
  `
})
export class BottomNavComponent {
  readonly tabs: readonly NavTab[] = [
    { path: '/pulpit', label: 'Pulpit', icon: 'home', exact: true },
    { path: '/magazyn', label: 'Magazyn', icon: 'inventory', exact: false },
    { path: '/przepisy', label: 'Przepisy', icon: 'recipes', exact: false },
    { path: '/zakupy', label: 'Zakupy', icon: 'shopping', exact: false }
  ];
}
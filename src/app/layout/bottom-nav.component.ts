import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '../shared/components/icon/icon.component';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [IconComponent, RouterLink, RouterLinkActive],
  template: `
    <!-- DOLNY PASEK NAWIGACJI (Czysta kapsuła 4-zakładkowa) -->
    <nav class="fixed bottom-0 w-full z-[60] pb-safe mb-4 flex justify-center pointer-events-none px-3">
      
      <!-- Pływająca kapsuła 4-zakładkowa w jasnej kolorystyce -->
      <div class="pointer-events-auto relative w-full max-w-[342px] h-[72px] bg-[#E5E2E1]/95 backdrop-blur-2xl rounded-full flex items-center justify-between p-2 shadow-[0_12px_36px_rgba(83,101,0,0.15)] border border-white/60">
        
        <!-- 1. PULPIT -->
        <a routerLink="/pulpit" 
           routerLinkActive="active-tab"
           #pulpitActive="routerLinkActive"
           [routerLinkActiveOptions]="{ exact: true }"
           class="relative flex-1 h-[56px] rounded-full flex flex-col items-center justify-center gap-0.5 transition-all duration-300 no-underline cursor-pointer"
           [class.bg-[#536500]]="pulpitActive.isActive"
           [class.text-white]="pulpitActive.isActive"
           [class.shadow-md]="pulpitActive.isActive"
           [class.shadow-[#536500]/30]="pulpitActive.isActive"
           [class.text-[#454934]]="!pulpitActive.isActive">
          
          <app-icon name="home" />
          <span class="text-[9px] leading-[11px] tracking-[0.5px] uppercase font-['Plus_Jakarta_Sans']"
                [class.font-extrabold]="pulpitActive.isActive"
                [class.font-medium]="!pulpitActive.isActive">
            Pulpit
          </span>
        </a>

        <!-- 2. MAGAZYN -->
        <a routerLink="/magazyn" 
           routerLinkActive="active-tab"
           #magazynActive="routerLinkActive"
           class="relative flex-1 h-[56px] rounded-full flex flex-col items-center justify-center gap-0.5 transition-all duration-300 no-underline cursor-pointer"
           [class.bg-[#536500]]="magazynActive.isActive"
           [class.text-white]="magazynActive.isActive"
           [class.shadow-md]="magazynActive.isActive"
           [class.shadow-[#536500]/30]="magazynActive.isActive"
           [class.text-[#454934]]="!magazynActive.isActive">
          
          <app-icon name="inventory" />
          <span class="text-[9px] leading-[11px] tracking-[0.5px] uppercase font-['Plus_Jakarta_Sans']"
                [class.font-extrabold]="magazynActive.isActive"
                [class.font-medium]="!magazynActive.isActive">
            Magazyn
          </span>
        </a>

        <!-- 3. PRZEPISY -->
        <a routerLink="/przepisy" 
           routerLinkActive="active-tab"
           #przepisyActive="routerLinkActive"
           class="relative flex-1 h-[56px] rounded-full flex flex-col items-center justify-center gap-0.5 transition-all duration-300 no-underline cursor-pointer"
           [class.bg-[#536500]]="przepisyActive.isActive"
           [class.text-white]="przepisyActive.isActive"
           [class.shadow-md]="przepisyActive.isActive"
           [class.shadow-[#536500]/30]="przepisyActive.isActive"
           [class.text-[#454934]]="!przepisyActive.isActive">
          
          <app-icon name="recipes" />
          <span class="text-[9px] leading-[11px] tracking-[0.5px] uppercase font-['Plus_Jakarta_Sans']"
                [class.font-extrabold]="przepisyActive.isActive"
                [class.font-medium]="!przepisyActive.isActive">
            Przepisy
          </span>
        </a>

        <!-- 4. ZAKUPY -->
        <a routerLink="/zakupy" 
           routerLinkActive="active-tab"
           #zakupyActive="routerLinkActive"
           class="relative flex-1 h-[56px] rounded-full flex flex-col items-center justify-center gap-0.5 transition-all duration-300 no-underline cursor-pointer"
           [class.bg-[#536500]]="zakupyActive.isActive"
           [class.text-white]="zakupyActive.isActive"
           [class.shadow-md]="zakupyActive.isActive"
           [class.shadow-[#536500]/30]="zakupyActive.isActive"
           [class.text-[#454934]]="!zakupyActive.isActive">
          
          <app-icon name="shopping" />
          <span class="text-[9px] leading-[11px] tracking-[0.5px] uppercase font-['Plus_Jakarta_Sans']"
                [class.font-extrabold]="zakupyActive.isActive"
                [class.font-medium]="!zakupyActive.isActive">
            Zakupy
          </span>
        </a>

      </div>
    </nav>
  `
})
export class BottomNavComponent {}
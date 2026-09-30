import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard-header',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="dashboard-top-bar">
      <div class="welcome-block">
        <span class="welcome-subtitle">Witaj z powrotem, {{ userName() }}</span>
        <h1 class="welcome-title">Podsumowanie Twojej kuchni</h1>
      </div>

      <div class="quick-expiring-indicator">
        <div class="title-with-icon">
          <img src="icons/hourglass.svg" class="hourglass-icon" alt="" />
          <span class="expiring-label">Warto zużyć w pierwszej kolejności</span>
        </div>
        <span class="pill-badge">{{ expiringCount() }} produkty</span>
      </div>
    </header>
  `,
  styleUrls: ['./dashboard-header.component.scss']
})
export class DashboardHeaderComponent {
  userName = input.required<string>();
  expiringCount = input<number>(0);
}
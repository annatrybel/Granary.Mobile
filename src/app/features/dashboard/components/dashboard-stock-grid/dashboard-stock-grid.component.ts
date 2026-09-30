import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StockSection } from '../../models/dashboard.models';

@Component({
  selector: 'app-dashboard-stock-grid',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-stock-grid.component.html',
  styleUrl: './dashboard-stock-grid.component.scss'
})
export class DashboardStockGridComponent {
  stockSections = input.required<StockSection[]>();
}
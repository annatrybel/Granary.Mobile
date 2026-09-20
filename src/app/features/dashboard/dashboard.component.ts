import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface ExpiringItem {
  id: number;
  name: string;
  category: string;
  timeLeftText: string;
}

interface StockSection {
  title: string;
  count: number;
  icon: string;
}

interface SuggestedRecipe {
  id: number;
  title: string;
  ingredientsUsed: string;
  durationAndPortions: string;
  imageUrl: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
  userName: string = 'ANNA';

  expiringItems: ExpiringItem[] = [
    {
      id: 1,
      name: 'Mleko owsiane',
      category: 'Lodówka',
      timeLeftText: 'Zostało 24h'
    },
    {
      id: 2,
      name: 'Świeży szpinak',
      category: 'Lodówka',
      timeLeftText: 'Zostało 48h'
    },
    {
      id: 3,
      name: 'Pomidorki koktajlowe',
      category: 'Lodówka',
      timeLeftText: 'Zostało 2 dni'
    }
  ];

  stockSections: StockSection[] = [
    { title: 'Lodówka', count: 34, icon: 'icons/fridge-unified.svg' },
    { title: 'Spiżarnia', count: 42, icon: 'icons/pantry-shelf.svg' },
    { title: 'Zamrażarka', count: 9, icon: 'icons/freezer-snowflake.svg' }
  ];

  recipes: SuggestedRecipe[] = [
    {
      id: 1,
      title: 'Kremowy makaron ze szpinakiem',
      ingredientsUsed: 'Wykorzystasz: Szpinak i Mleko',
      durationAndPortions: '15 min • 2 porcje',
      imageUrl: 'https://images.unsplash.com/photo-1621996346565-e3d5d628169b?auto=format&fit=crop&w=160&q=80'
    },
    {
      id: 2,
      title: 'Omlet z pomidorkami i ziołami',
      ingredientsUsed: 'Wykorzystasz: Mleko i Pomidorki',
      durationAndPortions: '10 min • 1 porcja',
      imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=160&q=80'
    },
    {
      id: 3,
      title: 'Sałatka ze świeżym szpinakiem',
      ingredientsUsed: 'Wykorzystasz: Szpinak i Pomidorki',
      durationAndPortions: '5 min • 2 porcje',
      imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=160&q=80'
    }
  ];
}
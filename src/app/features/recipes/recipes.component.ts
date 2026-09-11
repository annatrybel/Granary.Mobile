import { Component, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';

export interface RecipeTag {
  id: string;
  name: string;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  time: string;
  emoji: string;
  tags: string[];
  matchCount: number;
}

@Component({
  selector: 'app-recipes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recipes.component.html',
  styleUrl: './recipes.component.scss'
})
export class RecipesComponent {
  private router = inject(Router);

  // Aktywny tag
  selectedTag = signal<string>('all');
  
  // Zapytanie w szukajce
  searchQuery = signal<string>('');

  // Lista tagów 
  tags: RecipeTag[] = [
    { id: 'all', name: 'Wszystkie' },
    { id: 'vegan', name: 'Wegańskie' },
    { id: 'quick', name: 'Szybkie 15 min' },
    { id: 'vegetarian', name: 'Wegetariańskie' },
    { id: 'breakfast', name: 'Śniadania' },
    { id: 'dinner', name: 'Obiad' },
    { id: 'dessert', name: 'Desery' },
    { id: 'lowcal', name: 'Niskokaloryczne' }
  ];

  // Lista przykładowych przepisów
  recipes = signal<Recipe[]>([
    {
      id: '1',
      title: 'Kremowe Tofu z Suszonymi Pomidorami',
      description: 'Szybkie i sycące danie jednopatelniane w sosie śmietankowym.',
      time: '15 min',
      emoji: '🥘',
      tags: ['vegan', 'quick', 'dinner'],
      matchCount: 3
    },
    {
      id: '2',
      title: 'Owsianka z Mlekiem Owsianym i Owocami',
      description: 'Ciepłe i pożywne śniadanie pełne błonnika.',
      time: '10 min',
      emoji: '🥣',
      tags: ['vegan', 'quick', 'breakfast'],
      matchCount: 2
    },
    {
      id: '3',
      title: 'Sałatka ze Szpinakiem i Pomidorkami',
      description: 'Lekka i orzeźwiająca sałatka z dressingiem vinaigrette.',
      time: '10 min',
      emoji: '🥗',
      tags: ['vegan', 'vegetarian', 'quick', 'lowcal'],
      matchCount: 4
    }
  ]);

  // Filtrowanie przepisów po tagu oraz po frazie wyszukiwania
  filteredRecipes = computed(() => {
    const tag = this.selectedTag();
    const query = this.searchQuery().toLowerCase().trim();

    return this.recipes().filter(recipe => {
      const matchesTag = tag === 'all' || recipe.tags.includes(tag);
      const matchesQuery = !query || 
                           recipe.title.toLowerCase().includes(query) || 
                           recipe.description.toLowerCase().includes(query);
      return matchesTag && matchesQuery;
    });
  });

  selectTag(tagId: string): void {
    this.selectedTag.set(tagId);
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  toggleFilters(): void {
    console.log('Otwarto filtry zaawansowane');
  }

  openRecipe(id: string): void {
    this.router.navigate(['/przepisy', id]);
  }
}
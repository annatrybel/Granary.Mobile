import { Component, signal, computed, ChangeDetectionStrategy } from '@angular/core';

export interface ShoppingItem {
  id: string;
  name: string;
  quantity?: string;
  completed: boolean;
}

@Component({
  selector: 'app-shopping-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shopping-list.component.html',
  styleUrl: './shopping-list.component.scss'
})
export class ShoppingListComponent {
  isAdding = signal<boolean>(false);
  newItemName = signal<string>('');

  items = signal<ShoppingItem[]>([
    { id: '1', name: 'Mleko owsiane', quantity: '2 szt.', completed: false },
    { id: '2', name: 'Suszone Pomidory', quantity: '1 słoik', completed: false },
    { id: '3', name: 'Szpinak świeży', quantity: '1 opakowanie', completed: true },
    { id: '4', name: 'Kawa ziarnista', quantity: '1 kg', completed: false }
  ]);

  // Statystyki
  completedCount = computed(() => this.items().filter(i => i.completed).length);
  pendingCount = computed(() => this.items().filter(i => !i.completed).length);

  toggleAdding(): void {
    this.isAdding.update(val => !val);
    if (!this.isAdding()) {
      this.newItemName.set('');
    }
  }

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.newItemName.set(input.value);
  }

  addItem(): void {
    const name = this.newItemName().trim();
    if (!name) return;

    const newItem: ShoppingItem = {
      id: Date.now().toString(),
      name,
      completed: false
    };

    this.items.update(list => [newItem, ...list]);
    this.newItemName.set('');
    this.isAdding.set(false);
  }

  toggleItem(id: string): void {
    this.items.update(list => 
      list.map(item => item.id === id ? { ...item, completed: !item.completed } : item)
    );
  }

  removeItem(id: string): void {
    this.items.update(list => list.filter(item => item.id !== id));
  }

  clearCompleted(): void {
    this.items.update(list => list.filter(item => !item.completed));
  }
}
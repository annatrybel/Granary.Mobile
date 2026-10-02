import { Component, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { CreateCustomRecipePayload } from '../../models/recipe.models';

export interface FormIngredientItem {
  name: string;
  amount: number;
  unit: string;
}

@Component({
  selector: 'app-add-recipe-sheet',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './add-recipe-sheet.component.html',
  styleUrl: './add-recipe-sheet.component.scss'
})
export class AddRecipeSheetComponent {
  closeSheet = output<void>();
  save = output<CreateCustomRecipePayload>();

  title = signal<string>('');
  servings = signal<number>(1);
  prepTimeMinutes = signal<number>(15);
  selectedCategory = signal<string>('Obiad');
  imageUrl = signal<string | null>(null);

  readonly categories: string[] = ['Obiad', 'Śniadanie', 'Kolacja', 'Wypieki i ciasta', 'Przekąska'];
  readonly availableUnits: string[] = ['szt.', 'g', 'kg', 'ml', 'L', 'łyżka', 'szklanka', 'szczypta', 'op.'];

  ingredients = signal<FormIngredientItem[]>([
    { name: '', amount: 1, unit: 'szt.' }
  ]);

  steps = signal<string[]>(['']);

  changeServings(delta: number): void {
    this.servings.update(s => Math.max(1, s + delta));
  }

  changeTime(delta: number): void {
    this.prepTimeMinutes.update(t => Math.max(5, t + delta));
  }

  addIngredient(): void {
    this.ingredients.update(list => [...list, { name: '', amount: 1, unit: 'szt.' }]);
  }

  removeIngredient(index: number): void {
    if (this.ingredients().length <= 1) {
      this.ingredients.set([{ name: '', amount: 1, unit: 'szt.' }]);
      return;
    }
    this.ingredients.update(list => list.filter((_, i) => i !== index));
  }

  updateIngredientName(index: number, name: string): void {
    this.ingredients.update(list => list.map((item, i) => i === index ? { ...item, name } : item));
  }

  updateIngredientAmount(index: number, amount: number): void {
    this.ingredients.update(list => list.map((item, i) => i === index ? { ...item, amount: Math.max(0.1, amount) } : item));
  }

  updateIngredientUnit(index: number, unit: string): void {
    this.ingredients.update(list => list.map((item, i) => i === index ? { ...item, unit } : item));
  }

  addStep(): void {
    this.steps.update(list => [...list, '']);
  }

  updateStep(index: number, text: string): void {
    this.steps.update(list => list.map((s, i) => i === index ? text : s));
  }

  removeStep(index: number): void {
    if (this.steps().length <= 1) {
      this.steps.set(['']);
      return;
    }
    this.steps.update(list => list.filter((_, i) => i !== index));
  }

  onImageFileChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => this.imageUrl.set(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  }

  generateAiImage(): void {
    const titleVal = this.title().trim();
    if (!titleVal) {
      alert('Wpisz najpierw nazwę dania!');
      return;
    }
    this.imageUrl.set(`https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80`);
  }

  onSubmit(): void {
    const titleVal = this.title().trim();
    if (!titleVal) return;

    const formattedIngredients = this.ingredients()
      .filter(i => i.name.trim().length > 0)
      .map(i => ({
        name: i.name.trim(),
        quantity: `${i.amount} ${i.unit}`
      }));

    const formattedSteps = this.steps()
      .map(s => s.trim())
      .filter(s => s.length > 0);

    this.save.emit({
      title: titleVal,
      category: this.selectedCategory(),
      servings: this.servings(),
      prepTimeMinutes: this.prepTimeMinutes(),
      imageUrl: this.imageUrl() || undefined,
      ingredients: formattedIngredients,
      steps: formattedSteps
    });
  }
}
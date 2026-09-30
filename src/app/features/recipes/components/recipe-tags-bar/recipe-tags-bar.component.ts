import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RecipeTag } from '../../models/recipe.models';

@Component({
  selector: 'app-recipe-tags-bar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="recipe-tags-scroll">
      @for (tag of tags(); track tag.id) {
        <button 
          type="button"
          class="tag-pill" 
          [class.active]="selectedTag() === tag.id" 
          (click)="selectTag.emit(tag.id)">
          {{ tag.name }}
        </button>
      }
    </div>
  `,
  styleUrls: ['./recipe-tags-bar.component.scss']
})
export class RecipeTagsBarComponent {
  tags = input.required<RecipeTag[]>();
  selectedTag = input.required<string>();
  selectTag = output<string>();
}
import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-delete-modal',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="delete-overlay" (click)="cancel.emit()">
      <div class="delete-dialog" (click)="$event.stopPropagation()">
        <div class="delete-icon-circle">
          <svg width="18" height="20" viewBox="0 0 12 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.25 13.5C1.8375 13.5 1.48438 13.3531 1.19062 13.0594C0.896875 12.7656 0.75 12.4125 0.75 12V2.25H0V0.75H3.75V0H8.25V0.75H12V2.25H11.25V12C11.25 12.4125 11.1031 12.7656 10.8094 13.0594C10.5156 13.3531 10.1625 13.5 9.75 13.5H2.25ZM9.75 2.25H2.25V12H9.75V2.25ZM3.75 10.5H5.25V3.75H3.75V10.5ZM6.75 10.5H8.25V3.75H6.75V10.5ZM2.25 2.25V12V2.25Z" fill="#BA1A1A"/>
          </svg>
        </div>
        <h3 class="delete-title">Usunąć produkt?</h3>
        <p class="delete-desc">
          Czy na pewno chcesz usunąć <strong class="text-neutral-900">"{{ productName() }}"</strong> ze swojej spiżarni?
        </p>
        <div class="delete-actions">
          <button type="button" class="btn-cancel" (click)="cancel.emit()">Anuluj</button>
          <button type="button" class="btn-confirm" (click)="confirm.emit()">Usuń</button>
        </div>
      </div>
    </div>
  `,
  styleUrl: './confirm-delete-modal.component.scss'
})
export class ConfirmDeleteModalComponent {
  productName = input<string>('');
  cancel = output<void>();
  confirm = output<void>();
}
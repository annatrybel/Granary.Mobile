import { Component, ChangeDetectionStrategy, inject, input, output, signal } from '@angular/core';
import { APP_ICONS, MediaUrlPipe } from '@granary/shared';
import { AdminImageKind, AdminImageService } from '../../services/admin-image.service';
import { extractApiError } from '../../utils/api-error';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

@Component({
  selector: 'app-admin-image-picker',
  standalone: true,
  imports: [APP_ICONS, MediaUrlPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-2">
      <span class="text-xs font-bold text-neutral-700">{{ label() }}</span>

      <div class="flex items-center gap-4">
        <div class="w-24 h-24 shrink-0 rounded-2xl border border-neutral-200 bg-neutral-100 overflow-hidden flex items-center justify-center text-neutral-400">
          @if (value(); as url) {
            <img [src]="url | mediaUrl" [alt]="label()" class="w-full h-full object-cover" />
          } @else {
            <svg lucideImage [size]="28"></svg>
          }
        </div>

        <div class="flex flex-col gap-2 min-w-0">
          <div class="flex flex-wrap gap-2">
            <label
              class="h-9 px-3 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-700 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors">
              <svg lucideImage [size]="14"></svg>
              <span>Wgraj własne</span>
              <input type="file" accept="image/*" class="hidden" (change)="onFileChange($event)" />
            </label>

            <button type="button" (click)="generate()" [disabled]="isGenerating() || !prompt().trim()"
              [title]="prompt().trim() ? '' : 'Wpisz najpierw nazwę'"
              class="h-9 px-3 rounded-xl border border-[#536500]/30 bg-[#536500]/10 hover:bg-[#536500]/20 text-[#536500] font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              @if (isGenerating()) {
                <span class="inline-block w-3.5 h-3.5 rounded-full border-2 border-[#536500] border-t-transparent animate-spin"></span>
                <span>Generuję…</span>
              } @else {
                <svg lucideSparkles [size]="14"></svg>
                <span>Wygeneruj przez AI</span>
              }
            </button>

            @if (value()) {
              <button type="button" (click)="valueChange.emit(null)"
                class="h-9 px-3 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors">
                <svg lucideTrash [size]="14"></svg>
                <span>Usuń</span>
              </button>
            }
          </div>

          @if (errorMessage()) {
            <span class="text-[11px] font-semibold text-rose-600">{{ errorMessage() }}</span>
          }
        </div>
      </div>
    </div>
  `
})
export class AdminImagePickerComponent {
  private readonly imageService = inject(AdminImageService);

  readonly value = input<string | null>(null);
  readonly kind = input.required<AdminImageKind>();
  readonly prompt = input<string>('');
  readonly label = input<string>('Zdjęcie');

  readonly valueChange = output<string | null>();

  readonly isGenerating = signal(false);
  readonly errorMessage = signal<string | null>(null);

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.errorMessage.set('Wybierz plik graficzny.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      this.errorMessage.set('Plik jest za duży (maksymalnie 5 MB).');
      return;
    }

    this.errorMessage.set(null);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        this.valueChange.emit(reader.result);
      }
    };
    reader.onerror = () => this.errorMessage.set('Nie udało się odczytać pliku.');
    reader.readAsDataURL(file);
  }

  generate(): void {
    const prompt = this.prompt().trim();
    if (!prompt || this.isGenerating()) return;

    this.isGenerating.set(true);
    this.errorMessage.set(null);

    this.imageService.generate(this.kind(), prompt).subscribe({
      next: (url) => {
        this.isGenerating.set(false);
        this.valueChange.emit(url);
      },
      error: (err) => {
        this.isGenerating.set(false);
        this.errorMessage.set(err instanceof Error ? err.message : extractApiError(err, 'Nie udało się wygenerować obrazu.'));
      }
    });
  }
}

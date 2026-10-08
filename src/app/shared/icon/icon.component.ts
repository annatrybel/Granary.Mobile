import { Component, input, inject, effect, signal, ChangeDetectionStrategy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="inline-flex shrink-0 items-center justify-center [&>svg]:w-full [&>svg]:h-full" [innerHTML]="svgContent()"></span>
  `
})
export class IconComponent {
  name = input.required<string>();

  private http = inject(HttpClient);
  private sanitizer = inject(DomSanitizer);
  svgContent = signal<SafeHtml>('');

  constructor() {
    effect(() => {
      const fileName = this.name();
      if (fileName) {
        this.http.get(`icons/${fileName}.svg`, { responseType: 'text' })
          .subscribe({
            next: (rawSvg) => {
              this.svgContent.set(this.sanitizer.bypassSecurityTrustHtml(rawSvg));
            },
            error: () => console.error(`Błąd: Nie znaleziono pliku src/assets/icons/${fileName}.svg`)
          });
      }
    });
  }
}
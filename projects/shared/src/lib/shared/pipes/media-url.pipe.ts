import { Pipe, PipeTransform, inject } from '@angular/core';
import { MEDIA_BASE_URL } from '../../core/tokens/media-base-url.token';

@Pipe({
  name: 'mediaUrl',
  standalone: true
})
export class MediaUrlPipe implements PipeTransform {
  private readonly mediaBaseUrl = inject(MEDIA_BASE_URL);

  transform(value: string | null | undefined): string | null {
    if (!value) return null;

    if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:')) {
      return value;
    }

    const cleanKey = value.startsWith('/') ? value.substring(1) : value;

    return `${this.mediaBaseUrl}/${cleanKey}`;
  }
}
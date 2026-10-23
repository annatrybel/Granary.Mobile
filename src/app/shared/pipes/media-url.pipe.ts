import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../../environments/environment';

@Pipe({
  name: 'mediaUrl',
  standalone: true
})
export class MediaUrlPipe implements PipeTransform {
  transform(value: string | null | undefined): string | null {
    if (!value) return null;

    if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:')) {
      return value;
    }

    const cleanKey = value.startsWith('/') ? value.substring(1) : value;

    return `${environment.mediaBaseUrl}/${cleanKey}`;
  }
}
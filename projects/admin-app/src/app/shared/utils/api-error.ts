import { HttpErrorResponse } from '@angular/common/http';

export function extractApiError(err: unknown, fallback: string): string {
  if (!(err instanceof HttpErrorResponse)) return fallback;

  const body = err.error;
  if (typeof body === 'string' && body.trim()) return body;

  const fieldErrors: string[] = body?.errors ? Object.values<string[]>(body.errors).flat() : [];

  if (fieldErrors.length > 0 && (!body?.detail || body.title === 'One or more validation errors occurred.')) {
    return fieldErrors.join(' ');
  }

  return body?.detail || body?.message || fallback;
}

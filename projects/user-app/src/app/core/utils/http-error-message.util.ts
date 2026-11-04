function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function getHttpErrorMessage(error: unknown, fallback: string): string {
  const payload = isRecord(error) ? error['error'] : undefined;
  if (typeof payload === 'string' && payload.trim()) return payload;
  if (!isRecord(payload)) return fallback;

  for (const key of ['detail', 'message']) {
    const message = payload[key];
    if (typeof message === 'string' && message.trim()) return message;
  }

  const errors = payload['errors'];
  if (isRecord(errors)) {
    for (const value of Object.values(errors)) {
      if (typeof value === 'string' && value.trim()) return value;
      if (Array.isArray(value)) {
        const message = value.find(item => typeof item === 'string' && item.trim());
        if (typeof message === 'string') return message;
      }
    }
  }

  return typeof payload['title'] === 'string' && payload['title'].trim()
    ? payload['title']
    : fallback;
}

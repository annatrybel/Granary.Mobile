import { InjectionToken } from '@angular/core';

/** Hooks run on logout so apps can wipe user-scoped data they keep locally (e.g. IndexedDB). */
export const LOGOUT_CLEANUP = new InjectionToken<(() => unknown)[]>('LOGOUT_CLEANUP');

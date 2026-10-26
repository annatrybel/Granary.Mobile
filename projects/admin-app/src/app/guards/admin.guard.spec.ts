import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '@granary/shared';
import { adminGuard } from './admin.guard';

describe('adminGuard', () => {
  const authService = {
    hasRole: vi.fn(),
    logout: vi.fn(),
  };

  beforeEach(() => {
    authService.hasRole.mockReset();
    authService.logout.mockReset();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
      ],
    });
  });

  it('allows users with the Admin role', () => {
    authService.hasRole.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() => adminGuard(
      {} as Parameters<typeof adminGuard>[0],
      {} as Parameters<typeof adminGuard>[1],
    ));

    expect(authService.hasRole).toHaveBeenCalledWith('Admin');
    expect(result).toBe(true);
    expect(authService.logout).not.toHaveBeenCalled();
  });

  it('logs out and redirects users without the Admin role', () => {
    authService.hasRole.mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() => adminGuard(
      {} as Parameters<typeof adminGuard>[0],
      {} as Parameters<typeof adminGuard>[1],
    ));
    const router = TestBed.inject(Router);

    expect(authService.logout).toHaveBeenCalledOnce();
    expect(router.serializeUrl(result as UrlTree)).toBe('/login');
  });
});

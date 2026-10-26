import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@granary/shared';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.hasUnexpiredToken()) {
    return true;
  }

  authService.logout();
  return router.createUrlTree(['/auth']);
};

import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) {
    return true;
  }
  const path = state.url.split('?')[0].replace(/^\//, '') || 'home';
  return router.createUrlTree(['/login'], { queryParams: { next: path } });
};

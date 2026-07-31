import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';
import { AuthDrawerService } from '../services/auth-drawer';

export const authGuard: CanActivateFn = () => {
  const authService = inject(Auth);
  const authDrawerService = inject(AuthDrawerService);
  const router = inject(Router);

  if (authService.getToken()) {
    return true;
  }

  authDrawerService.open('login');
  router.navigate(['/products']).then();
  return false;
};

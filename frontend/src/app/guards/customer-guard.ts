import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Auth } from '../services/auth';
import { ToastService } from '../services/toast';

export const customerGuard: CanActivateFn = () => {
  const authService = inject(Auth);
  const router = inject(Router);
  const toastService = inject(ToastService);
  const translateService = inject(TranslateService);

  if (!authService.isAdmin()) {
    return true;
  }

  toastService.show(translateService.instant('ADMIN_SHOPPING_BLOCKED'), 'error');
  router.navigate(['/admin/products']).then();
  return false;
};

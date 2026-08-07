import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { Auth } from '../services/auth';
import { AuthDrawerService } from '../services/auth-drawer';
import { ToastService } from '../services/toast';

// The wishlist backend has a known bug where it rejects even fresh, valid tokens with 401
// (unrelated to session expiry — see WishlistService.isFallbackEligible). Forcing a logout
// on every wishlist 401 would log out users with perfectly valid sessions, so it's excluded
// here until that backend bug is fixed.
const SESSION_EXPIRY_EXCLUDED_PREFIXES = [environment.wishlistApiUrl];

export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(Auth);
  const authDrawerService = inject(AuthDrawerService);
  const toastService = inject(ToastService);
  const translateService = inject(TranslateService);

  return next(req).pipe(
    catchError(err => {
      const isSessionExpiry = err instanceof HttpErrorResponse
        && err.status === 401
        && req.headers.has('Authorization')
        && !SESSION_EXPIRY_EXCLUDED_PREFIXES.some(prefix => req.url.startsWith(prefix));

      if (isSessionExpiry) {
        authService.logout();
        toastService.show(translateService.instant('TOAST_SESSION_EXPIRED'), 'error');
        authDrawerService.open('login');
      }

      return throwError(() => err);
    })
  );
};

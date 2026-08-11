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

// This interceptor only makes sense for calls to our own backend APIs. It must
// not run for other requests (e.g. the i18n translation loader's own GET of
// /i18n/{lang}.json) — besides being semantically wrong (no auth/session
// concept applies to a static asset), injecting TranslateService here would
// make TranslateService's own translation-file request depend on
// TranslateService itself via this interceptor, an circular dependency that
// surfaces as NG0200 ("failed to load '<lang>' ... Cause: NG0200").
const API_BASE_URLS = [
  environment.usersApiUrl,
  environment.cartApiUrl,
  environment.orderApiUrl,
  environment.productApiUrl,
  environment.notificationApiUrl,
  environment.wishlistApiUrl,
  environment.chatApiUrl
];

export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  if (!API_BASE_URLS.some(base => req.url.startsWith(base))) {
    return next(req);
  }

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

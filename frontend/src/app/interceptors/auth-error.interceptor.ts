import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { Auth } from '../services/auth';
import { AuthDrawerService } from '../services/auth-drawer';
import { ToastService } from '../services/toast';

const SESSION_EXPIRY_EXCLUDED_PREFIXES = [environment.wishlistApiUrl];

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

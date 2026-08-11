import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { vi } from 'vitest';
import { environment } from '../../environments/environment';
import { authErrorInterceptor } from './auth-error.interceptor';
import { Auth } from '../services/auth';
import { AuthDrawerService } from '../services/auth-drawer';
import { ToastService } from '../services/toast';

describe('authErrorInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let authService: Auth;
  let authDrawerService: AuthDrawerService;
  let toastService: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authErrorInterceptor])),
        provideHttpClientTesting(),
        provideTranslateService()
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(Auth);
    authDrawerService = TestBed.inject(AuthDrawerService);
    toastService = TestBed.inject(ToastService);

    localStorage.setItem('token', 'stale-token');
    localStorage.setItem('user', JSON.stringify({ id: 1 }));

    vi.spyOn(authService, 'logout');
    vi.spyOn(toastService, 'show');
    vi.spyOn(authDrawerService, 'open');
  });

  afterEach(() => httpMock.verify());

  it('logs out and opens the login drawer on a 401 from an authenticated request', () => {
    httpClient.get(`${environment.cartApiUrl}/api/cart/1`, {
      headers: { Authorization: 'Bearer stale-token' }
    }).subscribe({ error: () => {} });

    httpMock.expectOne(`${environment.cartApiUrl}/api/cart/1`)
      .flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(authService.logout).toHaveBeenCalled();
    expect(toastService.show).toHaveBeenCalledWith(expect.any(String), 'error');
    expect(authDrawerService.open).toHaveBeenCalledWith('login');
  });

  it('does not treat a 401 from an unauthenticated request (e.g. bad login credentials) as session expiry', () => {
    httpClient.post(`${environment.usersApiUrl}/api/users/login`, { email: 'a@b.com', password: 'wrong' })
      .subscribe({ error: () => {} });

    httpMock.expectOne(`${environment.usersApiUrl}/api/users/login`)
      .flush({ message: 'Invalid email or password' }, { status: 401, statusText: 'Unauthorized' });

    expect(authService.logout).not.toHaveBeenCalled();
    expect(toastService.show).not.toHaveBeenCalled();
    expect(authDrawerService.open).not.toHaveBeenCalled();
  });

  it('does not force logout on a 401 from the wishlist backend (known separate backend bug, not session expiry)', () => {
    httpClient.get(`${environment.wishlistApiUrl}/api/wishlist/1`, {
      headers: { Authorization: 'Bearer stale-token' }
    }).subscribe({ error: () => {} });

    httpMock.expectOne(`${environment.wishlistApiUrl}/api/wishlist/1`)
      .flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(authService.logout).not.toHaveBeenCalled();
    expect(authDrawerService.open).not.toHaveBeenCalled();
  });

  it('passes through untouched for non-API requests (e.g. the i18n translation loader), never injecting any service', () => {
    // Regression test: this interceptor previously injected TranslateService
    // unconditionally for every request, including the i18n loader's own GET
    // of /i18n/{lang}.json — which made TranslateService's own translation
    // load depend on TranslateService via this interceptor, a circular
    // dependency that surfaced as NG0200. It must now skip entirely for
    // anything that isn't one of our backend API base URLs.
    httpClient.get('/i18n/hy.json').subscribe();

    httpMock.expectOne('/i18n/hy.json').flush({ SOME_KEY: 'value' });

    expect(authService.logout).not.toHaveBeenCalled();
    expect(toastService.show).not.toHaveBeenCalled();
    expect(authDrawerService.open).not.toHaveBeenCalled();
  });

  it('still propagates the error to the caller after handling it', () => {
    let caughtStatus: number | undefined;

    httpClient.get(`${environment.cartApiUrl}/api/cart/1`, {
      headers: { Authorization: 'Bearer stale-token' }
    }).subscribe({ error: err => (caughtStatus = err.status) });

    httpMock.expectOne(`${environment.cartApiUrl}/api/cart/1`)
      .flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(caughtStatus).toBe(401);
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { vi } from 'vitest';
import { environment } from '../../../environments/environment';

import { Profile } from './profile';

describe('Profile', () => {
  let component: Profile;
  let fixture: ComponentFixture<Profile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Profile],
      providers: [provideHttpClient(), provideRouter([]), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(Profile);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('Profile — recent orders / stats resolve, and only one logout control', () => {
  let fixture: ComponentFixture<Profile>;
  let httpMock: HttpTestingController;

  const ordersUrl = `${environment.orderApiUrl}/api/orders`;

  const fakeJwt = (payload: object) => `h.${btoa(JSON.stringify(payload))}.s`;

  const realOrderResponse = {
    success: true,
    message: 'Success',
    data: [
      {
        id: 7,
        userId: 36,
        items: [{ productId: 1, productName: 'iPhone 15, 128GB', productPrice: 400000, quantity: 1, totalPrice: 400000 }],
        totalPrice: 400000,
        status: 'PENDING',
        paymentMethod: 'IDRAM',
        createdAt: '2026-08-09T12:16:49.320043',
        updatedAt: '2026-08-09T12:16:49.320043'
      }
    ]
  };

  const drainLeftover = () => {
    let leftover = httpMock.match(() => true);
    while (leftover.length) {
      leftover.forEach(req => req.flush({ success: true, message: 'ok', data: [] }));
      leftover = httpMock.match(() => true);
    }
  };

  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('token', fakeJwt({ userId: 36, role: 'CUSTOMER' }));
    localStorage.setItem('user', JSON.stringify({ id: 36, name: 'Profile Test', email: 'profiletest@example.com', role: 'CUSTOMER', createdAt: '2026-08-09' }));

    await TestBed.configureTestingModule({
      imports: [Profile],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(Profile);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('resolves the spinner and shows the real order + orders stat once the request completes (previously stuck forever)', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.inline-loading .spinner')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.recent-order-list')).toBeNull();

    httpMock.expectOne(ordersUrl).flush(realOrderResponse);
    drainLeftover();

    expect(fixture.nativeElement.querySelector('.inline-loading')).toBeNull();
    const orderItem = fixture.nativeElement.querySelector('.recent-order-item');
    expect(orderItem).not.toBeNull();
    expect(orderItem.textContent).toContain('7');

    const ordersStat = fixture.nativeElement.querySelectorAll('.stat-tile strong')[0];
    expect(ordersStat.textContent.trim()).toBe('1');
  });

  it('shows a proper "no orders yet" empty state instead of a stuck spinner when the user has none', () => {
    fixture.detectChanges();

    httpMock.expectOne(ordersUrl).flush({ success: true, message: 'Success', data: [] });
    drainLeftover();

    expect(fixture.nativeElement.querySelector('.inline-loading')).toBeNull();
    expect(fixture.nativeElement.querySelector('.no-orders')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.recent-order-list')).toBeNull();

    const ordersStat = fixture.nativeElement.querySelectorAll('.stat-tile strong')[0];
    expect(ordersStat.textContent.trim()).toBe('0');
  });

  it('renders exactly one logout control (sidebar), not a duplicate in the welcome banner', () => {
    fixture.detectChanges();
    httpMock.expectOne(ordersUrl).flush({ success: true, message: 'Success', data: [] });
    drainLeftover();

    const logoutButtons = fixture.nativeElement.querySelectorAll('.sidebar-item.logout, .welcome-actions .logout-btn');
    expect(logoutButtons.length).toBe(1);
    expect(logoutButtons[0].classList.contains('sidebar-item')).toBe(true);
    expect(fixture.nativeElement.querySelector('.welcome-actions .logout-btn')).toBeNull();
  });

  it('sidebar alone still navigates to all 5 sections now that the redundant quick-action card grid is gone', () => {
    fixture.detectChanges();
    httpMock.expectOne(ordersUrl).flush({ success: true, message: 'Success', data: [] });
    drainLeftover();

    expect(fixture.nativeElement.querySelector('.quick-actions-grid')).toBeNull();
    expect(fixture.nativeElement.querySelector('.quick-action-card')).toBeNull();

    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const sidebarItem = (label: string): HTMLElement =>
      Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.sidebar-nav .sidebar-item'))
        .find(el => el.textContent?.includes(label))!;

    sidebarItem('ADDRESS_BOOK').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.profile-card.change-password-card')).toBeNull();
    expect(fixture.nativeElement.querySelector('.address-list, .no-addresses')).not.toBeNull();

    sidebarItem('SIDEBAR_MY_INFO').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.welcome-banner')).not.toBeNull();

    sidebarItem('ORDER_HISTORY').click();
    expect(navigateSpy).toHaveBeenCalledWith(['/orders']);

    sidebarItem('WISHLIST').click();
    expect(navigateSpy).toHaveBeenCalledWith(['/wishlist']);

    sidebarItem('ADDRESS_BOOK').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.address-list, .no-addresses')).not.toBeNull();

    sidebarItem('CHANGE_PASSWORD').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.profile-card.change-password-card')).not.toBeNull();
  });
});

describe('Profile — change password form', () => {
  let fixture: ComponentFixture<Profile>;
  let component: Profile;
  let httpMock: HttpTestingController;

  const ordersUrl = `${environment.orderApiUrl}/api/orders`;
  const passwordUrl = `${environment.usersApiUrl}/api/users/me/password`;

  const fakeJwt = (payload: object) => `h.${btoa(JSON.stringify(payload))}.s`;
  const token = fakeJwt({ userId: 36, role: 'CUSTOMER' });

  const drainLeftover = () => {
    let leftover = httpMock.match(() => true);
    while (leftover.length) {
      leftover.forEach(req => req.flush({ success: true, message: 'ok', data: [] }));
      leftover = httpMock.match(() => true);
    }
  };

  const setInput = (name: string, value: string) => {
    const nativeElement: HTMLElement = fixture.nativeElement;
    const el = nativeElement.querySelector<HTMLInputElement>(`input[name="${name}"]`);
    if (!el) throw new Error(`input [name="${name}"] not found`);
    el.value = value;
    el.dispatchEvent(new Event('input'));
  };

  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify({ id: 36, name: 'Profile Test', email: 'profiletest@example.com', role: 'CUSTOMER', createdAt: '2026-08-09' }));

    await TestBed.configureTestingModule({
      imports: [Profile],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(Profile);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    fixture.detectChanges();
    httpMock.expectOne(ordersUrl).flush({ success: true, message: 'Success', data: [] });
    drainLeftover();

    const nativeElement: HTMLElement = fixture.nativeElement;
    const changePasswordNavItem = Array.from<HTMLElement>(nativeElement.querySelectorAll('.sidebar-nav .sidebar-item'))
      .find(el => el.textContent?.includes('CHANGE_PASSWORD'))!;
    changePasswordNavItem.click();
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('blocks submission and shows a mismatch error when new/confirm passwords differ, without calling the backend', () => {
    setInput('currentPassword', 'OldPass123');
    setInput('newPassword', 'NewPass456');
    setInput('confirmNewPassword', 'Different789');

    const form: HTMLFormElement = fixture.nativeElement.querySelector('.change-password-card form');
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(component.passwordMismatch).toBe(true);
    expect(fixture.nativeElement.querySelector('.form-error').textContent).toContain('PASSWORDS_DO_NOT_MATCH');
    httpMock.expectNone(passwordUrl);
  });

  it('blocks submission and shows a too-short error when the new password is under 6 characters, without calling the backend', () => {
    setInput('currentPassword', 'OldPass123');
    setInput('newPassword', 'abc');
    setInput('confirmNewPassword', 'abc');

    const form: HTMLFormElement = fixture.nativeElement.querySelector('.change-password-card form');
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(component.passwordTooShort).toBe(true);
    expect(fixture.nativeElement.querySelector('.form-error').textContent).toContain('PASSWORD_TOO_SHORT');
    httpMock.expectNone(passwordUrl);
  });

  it('submits current/new password to PUT /api/users/me/password with the JWT, clears the form, and shows a success toast', () => {
    setInput('currentPassword', 'OldPass123');
    setInput('newPassword', 'NewPass456');
    setInput('confirmNewPassword', 'NewPass456');

    const form: HTMLFormElement = fixture.nativeElement.querySelector('.change-password-card form');
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const req = httpMock.expectOne(passwordUrl);
    expect(req.request.method).toBe('PUT');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    expect(req.request.body).toEqual({ currentPassword: 'OldPass123', newPassword: 'NewPass456' });

    req.flush({ success: true, message: 'Password changed successfully', data: null });
    fixture.detectChanges();

    expect(component.currentPassword).toBe('');
    expect(component.newPassword).toBe('');
    expect(component.confirmNewPassword).toBe('');
    expect(fixture.nativeElement.querySelector('.toast.success .toast-message').textContent).toContain('TOAST_PASSWORD_CHANGED');
  });

  it('shows the backend error message in a toast when the current password is wrong (400), and does not clear the form', () => {
    setInput('currentPassword', 'WrongPass999');
    setInput('newPassword', 'NewPass456');
    setInput('confirmNewPassword', 'NewPass456');

    const form: HTMLFormElement = fixture.nativeElement.querySelector('.change-password-card form');
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const req = httpMock.expectOne(passwordUrl);
    req.flush({ error: 'Error', message: 'Current password is incorrect', status: 400 }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    expect(component.currentPassword).toBe('WrongPass999');
    expect(fixture.nativeElement.querySelector('.toast.error .toast-message').textContent).toContain('Current password is incorrect');
  });
});

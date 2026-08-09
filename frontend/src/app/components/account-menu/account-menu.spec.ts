import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { AccountMenu } from './account-menu';

describe('AccountMenu', () => {
  let component: AccountMenu;
  let fixture: ComponentFixture<AccountMenu>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountMenu],
      providers: [provideHttpClient(), provideRouter([]), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountMenu);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('AccountMenu — simplified dropdown (logged in)', () => {
  let fixture: ComponentFixture<AccountMenu>;
  let httpMock: HttpTestingController;

  const fakeJwt = (payload: object) => `h.${btoa(JSON.stringify(payload))}.s`;

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
    localStorage.setItem('user', JSON.stringify({ id: 36, name: 'Menu Test', email: 'menutest@example.com', role: 'CUSTOMER', createdAt: '2026-08-09' }));

    await TestBed.configureTestingModule({
      imports: [AccountMenu],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountMenu);
    httpMock = TestBed.inject(HttpTestingController);

    fixture.detectChanges(); // ctor eager refreshes (cart/wishlist/notifications)
    drainLeftover();
  });

  afterEach(() => httpMock.verify());

  it('shows exactly My Page and Logout — Orders and Wishlist are gone', () => {
    const nativeElement: HTMLElement = fixture.nativeElement;
    nativeElement.querySelector<HTMLButtonElement>('.header-action-btn')!.click();
    fixture.detectChanges();

    const dropdownButtons = Array.from(nativeElement.querySelectorAll('.account-dropdown button'));
    expect(dropdownButtons.length).toBe(2);
    expect(dropdownButtons[0].textContent).toContain('PROFILE');
    expect(dropdownButtons[1].textContent).toContain('LOGOUT');
    expect(nativeElement.querySelector('.account-dropdown')!.textContent).not.toContain('ORDERS');
    expect(nativeElement.querySelector('.account-dropdown')!.textContent).not.toContain('WISHLIST');
  });
});

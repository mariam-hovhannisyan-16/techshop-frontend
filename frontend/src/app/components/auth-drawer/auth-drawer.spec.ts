import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { AuthDrawer } from './auth-drawer';
import { AuthDrawerService } from '../../services/auth-drawer';
import { environment } from '../../../environments/environment';

describe('AuthDrawer', () => {
  let component: AuthDrawer;
  let fixture: ComponentFixture<AuthDrawer>;
  let authDrawerService: AuthDrawerService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthDrawer],
      providers: [provideHttpClient(), provideRouter([]), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthDrawer);
    component = fixture.componentInstance;
    authDrawerService = TestBed.inject(AuthDrawerService);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders nothing when the drawer is closed', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.auth-modal')).toBeFalsy();
  });

  it('renders the login form when opened', () => {
    authDrawerService.open('login');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.auth-modal')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('input').length).toBe(2);
  });

  it('switches to the register form', () => {
    authDrawerService.open('login');
    fixture.detectChanges();
    component.switchMode('register');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('input').length).toBe(3);
  });

  it('has no self-service admin role toggle on the register form', () => {
    authDrawerService.open('register');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.role-tabs')).toBeFalsy();
  });

  it('closes on escape', async () => {
    authDrawerService.open('login');
    fixture.detectChanges();
    component.onEscape();
    await new Promise(resolve => setTimeout(resolve, 250));
    expect(authDrawerService.isOpen()).toBe(false);
  });
});

describe('AuthDrawer — registration always requests a regular user account', () => {
  let component: AuthDrawer;
  let fixture: ComponentFixture<AuthDrawer>;
  let authDrawerService: AuthDrawerService;
  let httpMock: HttpTestingController;

  const registerUrl = `${environment.usersApiUrl}/api/users/register`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthDrawer],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthDrawer);
    component = fixture.componentInstance;
    authDrawerService = TestBed.inject(AuthDrawerService);
    httpMock = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  afterEach(() => httpMock.verify());

  it('always sends role: CUSTOMER, with no way to request ADMIN from this form', () => {
    authDrawerService.open('register');
    fixture.detectChanges();

    component.registerName = 'Test User';
    component.registerEmail = 'test@example.com';
    component.registerPassword = 'password123';
    component.submitRegister();

    const req = httpMock.expectOne(registerUrl);
    expect(req.request.body.role).toBe('CUSTOMER');
    req.flush({ success: true, message: 'ok', data: { token: 't', user: { id: 1, name: 'Test User', email: 'test@example.com', role: 'CUSTOMER', createdAt: '2026-01-01' } } });

    let leftover = httpMock.match(() => true);
    while (leftover.length) {
      leftover.forEach(r => r.flush({ success: true, message: 'ok', data: [] }));
      leftover = httpMock.match(() => true);
    }
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { AuthDrawer } from './auth-drawer';
import { AuthDrawerService } from '../../services/auth-drawer';

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

  it('closes on escape', async () => {
    authDrawerService.open('login');
    fixture.detectChanges();
    component.onEscape();
    await new Promise(resolve => setTimeout(resolve, 250));
    expect(authDrawerService.isOpen()).toBe(false);
  });
});

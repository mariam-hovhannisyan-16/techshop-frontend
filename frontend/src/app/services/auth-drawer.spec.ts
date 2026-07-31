import { TestBed } from '@angular/core/testing';

import { AuthDrawerService } from './auth-drawer';

describe('AuthDrawerService', () => {
  let service: AuthDrawerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthDrawerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('starts closed in login mode', () => {
    expect(service.isOpen()).toBe(false);
    expect(service.mode()).toBe('login');
  });

  it('opens in the requested mode', () => {
    service.open('register');
    expect(service.isOpen()).toBe(true);
    expect(service.mode()).toBe('register');
  });

  it('defaults open() to login mode', () => {
    service.open();
    expect(service.mode()).toBe('login');
  });

  it('closes', () => {
    service.open();
    service.close();
    expect(service.isOpen()).toBe(false);
  });
});

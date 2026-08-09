import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
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

  // Shaped like the real response confirmed against the live backend for a fresh test
  // account (userId 36, order id 7) during this investigation.
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
    fixture.detectChanges(); // ngOnInit -> loadOrders(), plus CartService/WishlistService ctor eager refreshes

    // Spinner shows while the request is in flight, matching the reported bug's starting state.
    expect(fixture.nativeElement.querySelector('.inline-loading .spinner')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.recent-order-list')).toBeNull();

    httpMock.expectOne(ordersUrl).flush(realOrderResponse);
    drainLeftover(); // cart/wishlist/notifications badges' own eager refreshes

    // Deliberately no extra fixture.detectChanges() call here before asserting — flush()
    // runs the subscribe() callback synchronously, so if loadOrders() didn't call
    // this.cdr.detectChanges() internally (the actual bug), the view would still show the
    // stale spinner/zero-count state right now even though the component's own fields
    // (this.orders, this.ordersLoading) are already correct underneath.
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
});

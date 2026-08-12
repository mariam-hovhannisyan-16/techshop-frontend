import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';

import { Wishlist } from './wishlist';

describe('Wishlist', () => {
  let component: Wishlist;
  let fixture: ComponentFixture<Wishlist>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Wishlist],
      providers: [provideHttpClient(), provideRouter([]), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(Wishlist);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('Wishlist — empty-state layout and delivery-threshold interpolation', () => {
  let fixture: ComponentFixture<Wishlist>;
  let httpMock: HttpTestingController;

  const wishlistUrl = `${environment.wishlistApiUrl}/wishlist`;
  const productsUrl = `${environment.productApiUrl}/api/products`;

  const fakeJwt = (payload: object) => `h.${btoa(JSON.stringify(payload))}.s`;

  const emptyWishlistResponse = { success: true, message: 'ok', data: { id: 1, userId: 1, items: [], createdAt: '2026-01-01T00:00:00' } };

  const productsResponse = {
    success: true,
    message: 'ok',
    data: [
      { id: 1001, name: 'iPhone 15 Pro', description: '', price: 650000, stock: 5, imageUrl: '/img.jpg', rating: 4.9, reviewCount: 128 },
      { id: 1002, name: 'Galaxy S24', description: '', price: 500000, stock: 3, imageUrl: '/img2.jpg', rating: 4.5, reviewCount: 60 }
    ]
  };

  const drainLeftover = () => {
    let leftover = httpMock.match(() => true);
    while (leftover.length) {
      leftover.forEach(req => req.flush(req.request.url === wishlistUrl ? emptyWishlistResponse : { success: true, message: 'ok', data: [] }));
      leftover = httpMock.match(() => true);
    }
  };

  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('token', fakeJwt({ userId: 1, role: 'CUSTOMER' }));
    localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Test User', email: 'a@b.com', role: 'CUSTOMER', createdAt: '2026-01-01' }));

    await TestBed.configureTestingModule({
      imports: [Wishlist],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(Wishlist);
    httpMock = TestBed.inject(HttpTestingController);

    httpMock.expectOne(wishlistUrl).flush(emptyWishlistResponse);
    httpMock.expectOne(req => req.url === `${environment.cartApiUrl}/api/cart/1` && req.method === 'GET')
      .flush({ success: true, message: 'ok', data: { id: 1, userId: 1, items: [], totalPrice: 0 } });

    fixture.detectChanges();

    httpMock.expectOne(wishlistUrl).flush(emptyWishlistResponse);
    httpMock.expectOne(productsUrl).flush(productsResponse);

    fixture.detectChanges();
    drainLeftover();
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('interpolates the free-shipping threshold instead of leaving a literal {{threshold}}', () => {
    expect(fixture.componentInstance.freeShippingThresholdFormatted).toBe('֏30,000');

    const deliveryItems: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.delivery-card .check-list li'));
    for (const li of deliveryItems) {
      expect(li.textContent).not.toContain('{{threshold}}');
    }
  });

  it('marks the empty main column and centers it (row stretched, column flex-centered)', () => {
    const main = fixture.nativeElement.querySelector('.wishlist-main');
    expect(main.classList.contains('is-empty')).toBe(true);

    const layoutStyle = getComputedStyle(fixture.nativeElement.querySelector('.wishlist-layout'));
    expect(layoutStyle.alignItems).toBe('stretch');

    const mainStyle = getComputedStyle(main);
    expect(mainStyle.display).toBe('flex');
    expect(mainStyle.alignItems).toBe('center');
    expect(mainStyle.justifyContent).toBe('center');
  });

  it('wraps the empty state in a card matching the sidebar card style', () => {
    const card: HTMLElement = fixture.nativeElement.querySelector('.empty-state-card');
    expect(card).not.toBeNull();
    expect(card.querySelector('app-empty-state')).not.toBeNull();

    const cardStyle = getComputedStyle(card);
    const sidebarCardStyle = getComputedStyle(fixture.nativeElement.querySelector('.sidebar-card'));
    expect(cardStyle.borderRadius).toBe(sidebarCardStyle.borderRadius);
    expect(cardStyle.borderStyle).toBe(sidebarCardStyle.borderStyle);
  });

  it('leaves the sidebar (recommended products, delivery, secure-payments cards) unchanged', () => {
    expect(fixture.nativeElement.querySelector('.wishlist-sidebar')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.recommended-card')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.mini-product').length).toBe(2);
    expect(fixture.nativeElement.querySelector('.delivery-card')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.secure-card')).not.toBeNull();
  });
});

describe('Wishlist — price-drop notification preference (real backend, not localStorage)', () => {
  let fixture: ComponentFixture<Wishlist>;
  let component: Wishlist;
  let httpMock: HttpTestingController;

  const wishlistUrl = `${environment.wishlistApiUrl}/wishlist`;
  const productsUrl = `${environment.productApiUrl}/api/products`;
  const preferencesUrl = `${environment.usersApiUrl}/api/users/me/preferences`;

  const fakeJwt = (payload: object) => `h.${btoa(JSON.stringify(payload))}.s`;

  const wishlistItem = {
    id: 1, product: { id: 1001, name: 'iPhone 15 Pro', description: '', price: 650000, stock: 5, category: 'Phones', imageUrl: '/img.jpg', isNew: false, discountPercentage: null }, addedAt: '2026-01-01T00:00:00'
  };
  const wishlistResponse = { success: true, message: 'ok', data: { id: 1, userId: 1, items: [wishlistItem], createdAt: '2026-01-01T00:00:00' } };

  const drainLeftoverExcept = (excludeUrl: string) => {
    let leftover = httpMock.match(req => req.url !== excludeUrl);
    while (leftover.length) {
      leftover.forEach(req => req.flush(req.request.url === wishlistUrl ? wishlistResponse : { success: true, message: 'ok', data: [] }));
      leftover = httpMock.match(req => req.url !== excludeUrl);
    }
  };

  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('token', fakeJwt({ userId: 1, role: 'CUSTOMER' }));
    localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Test User', email: 'a@b.com', role: 'CUSTOMER', createdAt: '2026-01-01' }));

    await TestBed.configureTestingModule({
      imports: [Wishlist],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(Wishlist);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    httpMock.expectOne(wishlistUrl).flush(wishlistResponse);
    httpMock.expectOne(req => req.url === `${environment.cartApiUrl}/api/cart/1` && req.method === 'GET')
      .flush({ success: true, message: 'ok', data: { id: 1, userId: 1, items: [], totalPrice: 0 } });

    fixture.detectChanges();

    httpMock.expectOne(wishlistUrl).flush(wishlistResponse);
    httpMock.expectOne(productsUrl).flush({
      success: true, message: 'ok',
      data: [{ id: 1001, name: 'iPhone 15 Pro', description: '', price: 650000, stock: 5, imageUrl: '/img.jpg' }]
    });

    fixture.detectChanges();
    drainLeftoverExcept(preferencesUrl);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('fetches the real saved preference on load (GET /api/users/me/preferences) instead of reading localStorage', () => {
    const req = httpMock.expectOne(preferencesUrl);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, message: 'ok', data: { notifyPriceDrops: true } });
    fixture.detectChanges();

    expect(component.notifyPriceChanges).toBe(true);
    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('.notify-row input[type="checkbox"]');
    expect(checkbox.checked).toBe(true);
  });

  it('PATCHes notifyPriceDrops on toggle and reflects the persisted value back', () => {
    httpMock.expectOne(preferencesUrl).flush({ success: true, message: 'ok', data: { notifyPriceDrops: false } });
    fixture.detectChanges();
    expect(component.notifyPriceChanges).toBe(false);

    component.toggleNotifyPriceChanges();
    fixture.detectChanges();

    const patchReq = httpMock.expectOne(preferencesUrl);
    expect(patchReq.request.method).toBe('PATCH');
    expect(patchReq.request.body).toEqual({ notifyPriceDrops: true });
    patchReq.flush({ success: true, message: 'ok', data: { notifyPriceDrops: true } });
    fixture.detectChanges();

    expect(component.notifyPriceChanges).toBe(true);
    expect(component.notifyPriceChangesSaving).toBe(false);
  });

  it('reverts the toggle and leaves it usable again if the PATCH fails', () => {
    httpMock.expectOne(preferencesUrl).flush({ success: true, message: 'ok', data: { notifyPriceDrops: false } });
    fixture.detectChanges();

    component.toggleNotifyPriceChanges();
    fixture.detectChanges();
    expect(component.notifyPriceChanges).toBe(true);

    const patchReq = httpMock.expectOne(preferencesUrl);
    patchReq.flush({ success: false, message: 'error' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(component.notifyPriceChanges).toBe(false);
    expect(component.notifyPriceChangesSaving).toBe(false);
  });
});

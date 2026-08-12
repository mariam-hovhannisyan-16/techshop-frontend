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

  const wishlistUrl = `${environment.wishlistApiUrl}/api/v1/wishlist`;
  const productsUrl = `${environment.productApiUrl}/api/products`;

  const fakeJwt = (payload: object) => `h.${btoa(JSON.stringify(payload))}.s`;

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
      leftover.forEach(req => req.flush({ success: true, message: 'ok', data: [] }));
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

    httpMock.expectOne(wishlistUrl).flush({ success: true, message: 'ok', data: [] });
    httpMock.expectOne(req => req.url === `${environment.cartApiUrl}/api/cart/1` && req.method === 'GET')
      .flush({ success: true, message: 'ok', data: { id: 1, userId: 1, items: [], totalPrice: 0 } });

    fixture.detectChanges();

    httpMock.expectOne(wishlistUrl).flush({ success: true, message: 'ok', data: [] });
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

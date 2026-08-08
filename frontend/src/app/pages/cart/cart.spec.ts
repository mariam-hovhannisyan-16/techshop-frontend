import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';

import { Cart } from './cart';

describe('Cart', () => {
  let component: Cart;
  let fixture: ComponentFixture<Cart>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Cart],
      providers: [provideHttpClient(), provideRouter([]), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(Cart);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('Cart — table layout quantity and removal', () => {
  let fixture: ComponentFixture<Cart>;
  let httpMock: HttpTestingController;

  const cartUrl = `${environment.cartApiUrl}/api/cart/1`;
  const itemsUrl = `${environment.cartApiUrl}/api/cart/1/items`;
  const productsUrl = `${environment.productApiUrl}/api/products`;

  const fakeJwt = (payload: object) => `h.${btoa(JSON.stringify(payload))}.s`;

  const productsResponse = {
    success: true,
    message: 'ok',
    data: [
      { id: 1001, name: 'iPhone 15 Pro', description: '', price: 650000, stock: 5, imageUrl: '/img.jpg', spec: '128GB · A17 Pro chip' }
    ]
  };

  const cartWith = (quantity: number) => ({
    success: true,
    message: 'ok',
    data: {
      id: 1,
      userId: 1,
      items: quantity > 0 ? [{ productId: 1001, productName: 'iPhone 15 Pro', productPrice: 650000, quantity, totalPrice: 650000 * quantity }] : [],
      totalPrice: 650000 * quantity
    }
  });

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
      imports: [Cart],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(Cart);
    httpMock = TestBed.inject(HttpTestingController);

    // CartService's constructor eagerly refreshes the badge count.
    httpMock.expectOne(cartUrl).flush(cartWith(2));
    httpMock.expectOne(productsUrl).flush(productsResponse);

    fixture.detectChanges(); // ngOnInit -> loadCart()

    httpMock.expectOne(cartUrl).flush(cartWith(2));
    httpMock.expectOne(productsUrl).flush(productsResponse);

    fixture.detectChanges();
    drainLeftover(); // app-header's wishlist/notifications badges
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('renders the product spec chips and starting quantity', () => {
    const chips = fixture.nativeElement.querySelectorAll('.spec-chip');
    expect(Array.from(chips).map((el: any) => el.textContent.trim())).toEqual(['128GB', 'A17 Pro chip']);
    expect(fixture.nativeElement.querySelector('.qty-selector span').textContent.trim()).toBe('2');
  });

  it('increments quantity via the + button by calling addItem with a delta of 1', () => {
    const incrementBtn: HTMLButtonElement = fixture.nativeElement.querySelectorAll('.qty-selector button')[1];
    incrementBtn.click();

    const req = httpMock.expectOne(itemsUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ productId: 1001, quantity: 1 });
    req.flush(cartWith(3));
    httpMock.expectOne(productsUrl).flush(productsResponse);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.qty-selector span').textContent.trim()).toBe('3');
  });

  it('decrements quantity via the − button by removing then re-adding at the target quantity', () => {
    const decrementBtn: HTMLButtonElement = fixture.nativeElement.querySelectorAll('.qty-selector button')[0];
    decrementBtn.click();

    const removeReq = httpMock.expectOne(req => req.url === `${environment.cartApiUrl}/api/cart/1/items/1001` && req.method === 'DELETE');
    removeReq.flush(cartWith(0));

    const addReq = httpMock.expectOne(itemsUrl);
    expect(addReq.request.method).toBe('POST');
    expect(addReq.request.body).toEqual({ productId: 1001, quantity: 1 });
    addReq.flush(cartWith(1));
    httpMock.expectOne(productsUrl).flush(productsResponse);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.qty-selector span').textContent.trim()).toBe('1');
  });

  it('disables the − button at quantity 1 so it cannot go below 1', () => {
    const decrementBtn: HTMLButtonElement = fixture.nativeElement.querySelectorAll('.qty-selector button')[0];
    decrementBtn.click();
    httpMock.expectOne(req => req.url === `${environment.cartApiUrl}/api/cart/1/items/1001` && req.method === 'DELETE').flush(cartWith(0));
    httpMock.expectOne(itemsUrl).flush(cartWith(1));
    httpMock.expectOne(productsUrl).flush(productsResponse);
    fixture.detectChanges();

    const decrementBtnAfter: HTMLButtonElement = fixture.nativeElement.querySelectorAll('.qty-selector button')[0];
    expect(decrementBtnAfter.disabled).toBe(true);
  });

  it('removes the item via the trash button and shows the empty-cart state', () => {
    const trashBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.remove-btn');
    trashBtn.click();

    const req = httpMock.expectOne(req => req.url === `${environment.cartApiUrl}/api/cart/1/items/1001` && req.method === 'DELETE');
    req.flush(cartWith(0));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.cart-table')).toBeNull();
    expect(fixture.nativeElement.querySelector('.empty-cart')).not.toBeNull();
  });

  it('refreshes the cart from the server when "Update cart" is clicked', () => {
    const refreshBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.refresh-btn');
    refreshBtn.click();

    httpMock.expectOne(cartUrl).flush(cartWith(5));
    httpMock.expectOne(productsUrl).flush(productsResponse);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.qty-selector span').textContent.trim()).toBe('5');
  });
});

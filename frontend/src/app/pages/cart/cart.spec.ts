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

describe('Cart — card layout quantity, removal and wishlist', () => {
  let fixture: ComponentFixture<Cart>;
  let httpMock: HttpTestingController;

  const cartUrl = `${environment.cartApiUrl}/api/cart/1`;
  const itemsUrl = `${environment.cartApiUrl}/api/cart/1/items`;
  const productsUrl = `${environment.productApiUrl}/api/products`;
  const wishlistItemUrl = `${environment.wishlistApiUrl}/api/v1/wishlist/1001`;

  const fakeJwt = (payload: object) => `h.${btoa(JSON.stringify(payload))}.s`;

  const productsResponse = {
    success: true,
    message: 'ok',
    data: [
      { id: 1001, name: 'iPhone 15 Pro', description: '', price: 650000, stock: 5, imageUrl: '/img.jpg', rating: 4.9, reviewCount: 128 }
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
    drainLeftover(); // app-header's wishlist/notifications badges, WishlistService's own refresh()
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('renders the rating, price and starting quantity', () => {
    expect(fixture.nativeElement.querySelector('.item-name').textContent.trim()).toBe('iPhone 15 Pro');
    expect(fixture.nativeElement.querySelector('app-star-rating')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.qty-stepper input').value).toBe('2');
    expect(fixture.nativeElement.querySelector('.stock-status').textContent).toContain('CART_ITEM_IN_STOCK');
  });

  it('no longer renders the free-shipping banner anywhere on the page', () => {
    expect(fixture.nativeElement.querySelector('.shipping-banner')).toBeNull();
    expect(fixture.nativeElement.querySelector('.shipping-icon-badge')).toBeNull();
    expect(fixture.nativeElement.querySelector('.shipping-truck-icon')).toBeNull();
  });

  it('still shows the shared free-shipping threshold on the delivery-row tooltip', () => {
    // The banner is gone, but the delivery row's info tooltip still references the same
    // threshold — freeShippingThresholdFormatted / FREE_SHIPPING_THRESHOLD_AMD must stay.
    expect(fixture.componentInstance.freeShippingThresholdFormatted).toBe('֏30,000');
    const tooltip = fixture.nativeElement.querySelector('.delivery-label app-icon').getAttribute('title');
    expect(tooltip).toContain('FREE_DELIVERY_THRESHOLD');
  });

  it('shows a real ֏1,000 delivery fee (not "Free") and includes it in the total', () => {
    const rows = fixture.nativeElement.querySelectorAll('.summary-row');
    const subtotalRow = rows[0];
    const deliveryRow = rows[1];
    const totalRow = fixture.nativeElement.querySelector('.summary-row.total-row');

    // cart total from cartWith(2) is 650000 * 2 = 1,300,000
    expect(subtotalRow.querySelector('span:last-child').textContent.trim()).toBe('֏1,300,000');
    expect(deliveryRow.querySelector('span:last-child').textContent.trim()).toBe('֏1,000');
    expect(totalRow.querySelector('span:last-child').textContent.trim()).toBe('֏1,301,000');

    expect(fixture.componentInstance.deliveryFeeAmd).toBe(1000);
    expect(fixture.componentInstance.cartTotalWithDelivery).toBe(1301000);
  });

  it('increments quantity via the + button by calling addItem with a delta of 1', () => {
    const incrementBtn: HTMLButtonElement = fixture.nativeElement.querySelectorAll('.qty-stepper button')[1];
    incrementBtn.click();

    const req = httpMock.expectOne(itemsUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ productId: 1001, quantity: 1 });
    req.flush(cartWith(3));
    httpMock.expectOne(productsUrl).flush(productsResponse);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.qty-stepper input').value).toBe('3');
  });

  it('decrements quantity via the − button by removing then re-adding at the target quantity', () => {
    const decrementBtn: HTMLButtonElement = fixture.nativeElement.querySelectorAll('.qty-stepper button')[0];
    decrementBtn.click();

    const removeReq = httpMock.expectOne(req => req.url === `${environment.cartApiUrl}/api/cart/1/items/1001` && req.method === 'DELETE');
    removeReq.flush(cartWith(0));

    const addReq = httpMock.expectOne(itemsUrl);
    expect(addReq.request.method).toBe('POST');
    expect(addReq.request.body).toEqual({ productId: 1001, quantity: 1 });
    addReq.flush(cartWith(1));
    httpMock.expectOne(productsUrl).flush(productsResponse);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.qty-stepper input').value).toBe('1');
  });

  it('changes quantity by typing directly into the quantity input', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('.qty-stepper input');
    input.value = '5';
    input.dispatchEvent(new Event('change'));

    const req = httpMock.expectOne(itemsUrl);
    expect(req.request.body).toEqual({ productId: 1001, quantity: 3 });
    req.flush(cartWith(5));
    httpMock.expectOne(productsUrl).flush(productsResponse);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.qty-stepper input').value).toBe('5');
  });

  it('disables the − button at quantity 1 so it cannot go below 1', () => {
    const decrementBtn: HTMLButtonElement = fixture.nativeElement.querySelectorAll('.qty-stepper button')[0];
    decrementBtn.click();
    httpMock.expectOne(req => req.url === `${environment.cartApiUrl}/api/cart/1/items/1001` && req.method === 'DELETE').flush(cartWith(0));
    httpMock.expectOne(itemsUrl).flush(cartWith(1));
    httpMock.expectOne(productsUrl).flush(productsResponse);
    fixture.detectChanges();

    const decrementBtnAfter: HTMLButtonElement = fixture.nativeElement.querySelectorAll('.qty-stepper button')[0];
    expect(decrementBtnAfter.disabled).toBe(true);
  });

  it('removes the item via the trash button and shows the empty-cart state', () => {
    const trashBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.remove-btn');
    trashBtn.click();

    const req = httpMock.expectOne(req => req.url === `${environment.cartApiUrl}/api/cart/1/items/1001` && req.method === 'DELETE');
    req.flush(cartWith(0));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.cart-item-card')).toBeNull();
    expect(fixture.nativeElement.querySelector('.empty-cart')).not.toBeNull();
  });

  it('refreshes the cart from the server when "Update cart" is clicked', () => {
    const refreshBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.refresh-btn');
    refreshBtn.click();

    httpMock.expectOne(cartUrl).flush(cartWith(5));
    httpMock.expectOne(productsUrl).flush(productsResponse);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.qty-stepper input').value).toBe('5');
  });

  it('toggles the wishlist heart button for the item', () => {
    const wishlistBtn: HTMLButtonElement = fixture.nativeElement.querySelector('app-wishlist-button .wishlist-btn');
    expect(wishlistBtn.classList.contains('active')).toBe(false);

    wishlistBtn.click();

    const req = httpMock.expectOne(req => req.url === wishlistItemUrl && req.method === 'POST');
    req.flush({ success: true, message: 'ok', data: [{ productId: 1001, productName: 'iPhone 15 Pro', productPrice: 650000, quantity: 1 }] });
    fixture.detectChanges();

    expect(wishlistBtn.classList.contains('active')).toBe(true);
  });

  it('adds the three visual-polish accents: heading glow, summary top edge, and CTA glow', () => {
    // jsdom doesn't implement getComputedStyle for pseudo-elements ("Not implemented:
    // Window's getComputedStyle() method: with pseudo-elements"), so the ::before
    // gradients themselves can't be inspected here — the compiled build succeeding
    // already confirms that scss is valid. What we *can* verify in this environment is
    // that the real elements hosting those pseudo-elements are wired up correctly, which
    // is what actually determines whether the glow renders in the right place.
    const header: HTMLElement = fixture.nativeElement.querySelector('.cart-page-header');
    expect(getComputedStyle(header).position).toBe('relative');
    const heading: HTMLElement = fixture.nativeElement.querySelector('.cart-heading');
    expect(getComputedStyle(heading).position).toBe('relative'); // stacks above the glow

    const summaryCard: HTMLElement = fixture.nativeElement.querySelector('.summary-card');
    const summaryStyle = getComputedStyle(summaryCard);
    expect(summaryStyle.overflow).toBe('hidden'); // clips the top-edge bar to the rounded corners
    expect(summaryStyle.position).toBe('sticky'); // unaffected by the new overflow/edge

    const orderBtn: HTMLElement = fixture.nativeElement.querySelector('.order-btn');
    const orderBtnStyle = getComputedStyle(orderBtn);
    expect(orderBtnStyle.boxShadow).not.toBe('none');
    // jsdom doesn't resolve var() inside shorthand properties, so this stays as the raw
    // custom-property reference rather than the resolved rgba(0, 102, 255, ...) — still
    // enough to confirm the accent-glow token is actually wired into box-shadow.
    expect(orderBtnStyle.boxShadow).toContain('var(--accent-soft-strong)');
  });
});

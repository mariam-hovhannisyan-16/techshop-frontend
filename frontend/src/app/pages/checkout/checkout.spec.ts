import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { vi } from 'vitest';
import { environment } from '../../../environments/environment';

import { Checkout } from './checkout';

describe('Checkout', () => {
  let component: Checkout;
  let fixture: ComponentFixture<Checkout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Checkout],
      providers: [provideHttpClient(), provideRouter([]), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(Checkout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('Checkout — single-page end-to-end submission', () => {
  let fixture: ComponentFixture<Checkout>;
  let component: Checkout;
  let httpMock: HttpTestingController;
  let router: Router;

  const cartUrl = `${environment.cartApiUrl}/api/cart/1`;
  const productsUrl = `${environment.productApiUrl}/api/products`;
  const checkoutUrl = `${environment.orderApiUrl}/api/orders/checkout`;

  const fakeJwt = (payload: object) =>
    `h.${btoa(JSON.stringify(payload))}.s`;

  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('token', fakeJwt({ userId: 1, role: 'CUSTOMER' }));
    localStorage.setItem('user', JSON.stringify({
      id: 1, name: 'Test User', email: 'account@example.com', role: 'CUSTOMER', createdAt: '2026-01-01'
    }));

    await TestBed.configureTestingModule({
      imports: [Checkout],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideTranslateService()
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Checkout);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);

    // CartService's constructor eagerly refreshes the cart badge count when a token is
    // present; give it an empty cart so it doesn't also try to fetch the product catalog.
    httpMock.expectOne(cartUrl).flush({ success: true, message: 'ok', data: { id: 1, userId: 1, items: [], totalPrice: 0 } });

    fixture.detectChanges(); // runs ngOnInit -> loadCart()

    httpMock.expectOne(cartUrl).flush({
      success: true,
      message: 'ok',
      data: {
        id: 1,
        userId: 1,
        items: [{ productId: 1001, productName: 'iPhone 15 Pro', productPrice: 650000, quantity: 1, totalPrice: 650000 }],
        totalPrice: 650000
      }
    });

    httpMock.expectOne(productsUrl).flush({
      success: true,
      message: 'ok',
      data: [{ id: 1001, name: 'iPhone 15 Pro', description: '', price: 650000, stock: 5, imageUrl: '/img.jpg' }]
    });

    fixture.detectChanges();

    // app-header also renders the wishlist/notifications badges, which fetch their own
    // counts on init — irrelevant to checkout itself, just drain them so they don't leak
    // into the assertions below or trip httpMock.verify().
    let leftover = httpMock.match(() => true);
    while (leftover.length) {
      leftover.forEach(req => req.flush({ success: true, message: 'ok', data: [] }));
      leftover = httpMock.match(() => true);
    }
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('prefills the account email and shows the loaded cart total', () => {
    expect(component.contactEmail).toBe('account@example.com');
    expect(component.isCartEmpty).toBe(false);
    expect(component.cart?.totalPrice).toBe(650000);
  });

  it('blocks submission and surfaces validation errors when required fields are missing', () => {
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form.checkout-form');
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(component.formTouched).toBe(true);
    expect(component.placingOrder).toBe(false);
    const errors = fixture.nativeElement.querySelectorAll('.field-error');
    expect(errors.length).toBeGreaterThan(0);

    httpMock.expectNone(checkoutUrl);
  });

  it('places the order end-to-end once every field is filled in and submitted via the DOM', () => {
    const nativeElement: HTMLElement = fixture.nativeElement;

    // 1. Payment method — click the actual button, as a user would.
    const paymentButtons = nativeElement.querySelectorAll<HTMLButtonElement>('.payment-option');
    paymentButtons[0].click(); // IDRAM
    fixture.detectChanges();
    expect(component.paymentMethod).toBe('IDRAM');

    // 2. Delivery details — fill every field through its real input element.
    const setInput = (name: string, value: string) => {
      const el = nativeElement.querySelector<HTMLInputElement | HTMLTextAreaElement>(`input[name="${name}"], textarea[name="${name}"]`);
      if (!el) throw new Error(`input [name="${name}"] not found`);
      el.value = value;
      el.dispatchEvent(new Event('input'));
    };
    const setSelect = (name: string, value: string) => {
      const el = nativeElement.querySelector<HTMLSelectElement>(`select[name="${name}"]`);
      if (!el) throw new Error(`select [name="${name}"] not found`);
      el.value = value;
      el.dispatchEvent(new Event('change'));
    };

    setInput('firstName', 'Անի');
    setInput('lastName', 'Հակոբյան');
    setInput('phone', '77123456');
    setInput('email', 'ani@example.com');
    setSelect('city', 'Yerevan');
    setInput('cityDistrict', 'Kentron');
    setInput('addressLine', 'Mashtots 1');
    setInput('postalCode', '0001');
    setInput('notes', 'Please call before delivery');
    fixture.detectChanges();

    // 3. Terms checkbox.
    const termsCheckbox = nativeElement.querySelector<HTMLInputElement>('input[name="agreedToTerms"]')!;
    termsCheckbox.checked = true;
    termsCheckbox.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(component.isFormValid).toBe(true);

    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    // 4. Submit the form as a user clicking "Գնել" would.
    const submitBtn = nativeElement.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(submitBtn.disabled).toBe(false);
    submitBtn.click();
    fixture.detectChanges();

    const checkoutReq = httpMock.expectOne(checkoutUrl);
    expect(checkoutReq.request.method).toBe('POST');
    expect(checkoutReq.request.body.paymentMethod).toBe('IDRAM');
    expect(checkoutReq.request.body.shippingAddress.fullName).toBe('Անի Հակոբյան');
    expect(checkoutReq.request.body.shippingAddress.country).toBe('Armenia');
    expect(checkoutReq.request.body.shippingAddress.phone).toBe('+37477123456');
    expect(checkoutReq.request.body.shippingAddress.city).toBe('Yerevan');
    expect(checkoutReq.request.body.shippingAddress.state).toBe('Kentron');
    expect(checkoutReq.request.body.notes).toBe('Please call before delivery');

    checkoutReq.flush({
      success: true,
      message: 'ok',
      data: { id: 555, userId: 1, items: [], totalPrice: 650000, status: 'PENDING', paymentMethod: 'IDRAM', createdAt: '2026-01-01' }
    });

    expect(component.placingOrder).toBe(false);
    expect(component.placeOrderError).toBe('');
    expect(navigateSpy).toHaveBeenCalledWith(
      ['/order-confirmation', 555],
      expect.objectContaining({ state: expect.objectContaining({ justCheckedOut: true }) })
    );
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { LanguageService } from '../../services/language';

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
  const clearCartUrl = `${environment.cartApiUrl}/api/cart/1/clear`;
  const productsUrl = `${environment.productApiUrl}/api/products`;
  const checkoutUrl = `${environment.orderApiUrl}/api/orders/checkout`;

  const flushCartClear = () => {
    const clearReq = httpMock.expectOne(clearCartUrl);
    expect(clearReq.request.method).toBe('DELETE');
    clearReq.flush({ success: true, message: 'ok', data: null });
  };

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

    httpMock.expectOne(cartUrl).flush({ success: true, message: 'ok', data: { id: 1, userId: 1, items: [], totalPrice: 0 } });

    fixture.detectChanges();

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

  it('shows the reference-matching labels/logos in Cash, Idram, Telcell, VTB order, without disturbing selection behavior', () => {
    const nativeElement: HTMLElement = fixture.nativeElement;
    const paymentButtons = nativeElement.querySelectorAll<HTMLButtonElement>('.payment-option');
    expect(paymentButtons.length).toBe(4);

    expect(paymentButtons[0].querySelector('img')).toBeNull();
    expect(paymentButtons[0].querySelector('app-icon')).not.toBeNull();
    expect(paymentButtons[0].textContent).toContain('PAYMENT_ROKET_LINE');

    const idramImg = paymentButtons[1].querySelector<HTMLImageElement>('.payment-logo-chip img');
    expect(idramImg).not.toBeNull();
    expect(idramImg!.getAttribute('src')).toBe('icons/payment/idram.svg');
    expect(idramImg!.getAttribute('alt')).toBe('Idram');

    const telcellImg = paymentButtons[2].querySelector<HTMLImageElement>('.payment-logo-chip img');
    expect(telcellImg).not.toBeNull();
    expect(telcellImg!.getAttribute('src')).toBe('icons/payment/telcell.svg');
    expect(telcellImg!.getAttribute('alt')).toBe('Telcell Wallet');

    const vtbImg = paymentButtons[3].querySelector<HTMLImageElement>('.payment-logo-chip img');
    expect(vtbImg).not.toBeNull();
    expect(vtbImg!.getAttribute('src')).toBe('icons/payment/vtb.svg');

    expect(paymentButtons[1].classList.contains('active')).toBe(false);
    paymentButtons[1].click();
    fixture.detectChanges();
    expect(paymentButtons[1].classList.contains('active')).toBe(true);
    expect(component.paymentMethod).toBe('IDRAM');
  });

  it('shows the installment cost breakdown in Order Summary once a plan is confirmed', () => {
    const nativeElement: HTMLElement = fixture.nativeElement;
    const numberFormat = new Intl.NumberFormat('en-US');

    component.onInstallmentPlanConfirmed({
      bank: 'Test Bank',
      annualRate: 18.5,
      durationMonths: 12,
      downPayment: 100000,
      monthlyPayment: 50000
    });
    fixture.detectChanges();

    expect(component.paymentMethod).toBe('INSTALLMENT');

    const rows = Array.from(nativeElement.querySelectorAll('.summary-items .summary-item'));
    const cashPriceRow = rows.find(r => r.textContent?.includes('CHECKOUT_CASH_PRICE'));
    const downPaymentRow = rows.find(r => r.textContent?.includes('CHECKOUT_INSTALLMENT_DOWN_PAYMENT'));
    const monthlyRow = rows.find(r => r.textContent?.includes('CHECKOUT_INSTALLMENT_MONTHLY'));

    expect(cashPriceRow).toBeTruthy();
    const cashPricePriceEl = cashPriceRow!.querySelector('.price')!;
    expect(cashPricePriceEl.classList.contains('strikethrough')).toBe(true);
    expect(cashPricePriceEl.textContent).toContain(numberFormat.format(650000));

    expect(downPaymentRow).toBeTruthy();
    expect(downPaymentRow!.querySelector('.price')!.textContent).toContain(numberFormat.format(100000));

    expect(monthlyRow).toBeTruthy();
    const monthlyPriceText = monthlyRow!.querySelector('.price')!.textContent ?? '';
    expect(monthlyPriceText).toContain(numberFormat.format(50000));
    expect(monthlyPriceText).toContain('12');

    const totalRow = nativeElement.querySelector('.summary-total')!;
    expect(totalRow.querySelector('span')!.textContent!.trim()).toBe('CHECKOUT_INSTALLMENT_TOTAL');
    expect(totalRow.querySelector('strong')!.textContent).toContain(numberFormat.format(700000));
  });

  it('reverts to the flat cart total when switching away from installment to another payment method', () => {
    const nativeElement: HTMLElement = fixture.nativeElement;
    const numberFormat = new Intl.NumberFormat('en-US');

    component.onInstallmentPlanConfirmed({
      bank: 'Test Bank',
      annualRate: 18.5,
      durationMonths: 12,
      downPayment: 100000,
      monthlyPayment: 50000
    });
    fixture.detectChanges();
    expect(nativeElement.querySelector('.cash-price-row')).not.toBeNull();

    const paymentButtons = nativeElement.querySelectorAll<HTMLButtonElement>('.payment-option');
    paymentButtons[1].click();
    fixture.detectChanges();

    expect(component.paymentMethod).toBe('IDRAM');
    expect(nativeElement.querySelector('.cash-price-row')).toBeNull();
    expect(nativeElement.querySelectorAll('.summary-items .summary-item').length).toBe(1);

    const totalRow = nativeElement.querySelector('.summary-total')!;
    expect(totalRow.querySelector('span')!.textContent!.trim()).toBe('TOTAL');
    expect(totalRow.querySelector('strong')!.textContent).toContain(numberFormat.format(650000));
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

    const paymentButtons = nativeElement.querySelectorAll<HTMLButtonElement>('.payment-option');
    paymentButtons[1].click();
    fixture.detectChanges();
    expect(component.paymentMethod).toBe('IDRAM');

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
    setSelect('city', 'Gyumri');
    setSelect('region', 'Shirak');
    setInput('addressLine', 'Mashtots 1');
    setInput('postalCode', '0001');
    setInput('notes', 'Please call before delivery');
    fixture.detectChanges();

    const termsCheckbox = nativeElement.querySelector<HTMLInputElement>('input[name="agreedToTerms"]')!;
    termsCheckbox.checked = true;
    termsCheckbox.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(component.isFormValid).toBe(true);

    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

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
    expect(checkoutReq.request.body.shippingAddress.city).toBe('Gyumri');
    expect(checkoutReq.request.body.shippingAddress.state).toBe('Shirak');
    expect(checkoutReq.request.body.notes).toBe('Please call before delivery');
    expect(checkoutReq.request.body.language).toBe('HY');

    checkoutReq.flush({
      success: true,
      message: 'ok',
      data: {
        id: 555, userId: 1, items: [], totalPrice: 650000, status: 'PENDING', paymentMethod: 'IDRAM', createdAt: '2026-01-01',
        paymentRedirectUrl: 'https://sandbox.idram.am/payment?ref=fake&amount=650000&merchant_id=sandbox-merchant'
      }
    });
    flushCartClear();

    expect(component.placingOrder).toBe(false);
    expect(component.placeOrderError).toBe('');
    expect(navigateSpy).toHaveBeenCalledTimes(1);
    const [route, extras] = navigateSpy.mock.calls[0];
    expect(route).toEqual(['/order-confirmation', 555]);
    expect(extras?.state).toEqual({ justCheckedOut: true, paymentMethod: 'IDRAM' });
    expect(extras?.state).not.toHaveProperty('paymentRedirectUrl');
  });

  it('sends the site language actually selected via LanguageService, not always Armenian', () => {
    const nativeElement: HTMLElement = fixture.nativeElement;

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

    const languageService = TestBed.inject(LanguageService);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    languageService.setLanguage('en');
    fixture.detectChanges();

    const paymentButtons = nativeElement.querySelectorAll<HTMLButtonElement>('.payment-option');
    paymentButtons[1].click();
    setInput('firstName', 'Անի');
    setInput('lastName', 'Հակոբյան');
    setInput('phone', '77123456');
    setInput('email', 'ani@example.com');
    setSelect('city', 'Yerevan');
    setSelect('region', 'Yerevan');
    setInput('addressLine', 'Mashtots 1');
    setInput('postalCode', '0001');
    fixture.detectChanges();

    const termsCheckbox = nativeElement.querySelector<HTMLInputElement>('input[name="agreedToTerms"]')!;
    termsCheckbox.checked = true;
    termsCheckbox.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(component.isFormValid).toBe(true);

    const submitBtn = nativeElement.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    submitBtn.click();
    fixture.detectChanges();

    const checkoutReq = httpMock.expectOne(checkoutUrl);
    expect(checkoutReq.request.body.language).toBe('EN');
    checkoutReq.flush({
      success: true,
      message: 'ok',
      data: { id: 556, userId: 1, items: [], totalPrice: 650000, status: 'PENDING', paymentMethod: 'IDRAM', createdAt: '2026-01-01' }
    });
    flushCartClear();

    languageService.setLanguage('ru');
    fixture.detectChanges();
    submitBtn.click();
    fixture.detectChanges();

    const secondReq = httpMock.expectOne(checkoutUrl);
    expect(secondReq.request.body.language).toBe('RU');
    secondReq.flush({
      success: true,
      message: 'ok',
      data: { id: 557, userId: 1, items: [], totalPrice: 650000, status: 'PENDING', paymentMethod: 'IDRAM', createdAt: '2026-01-01' }
    });
    flushCartClear();
  });
});

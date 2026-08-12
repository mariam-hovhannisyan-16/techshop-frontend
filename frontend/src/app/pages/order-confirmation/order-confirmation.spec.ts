import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { PaymentMethod } from '../../services/order';

import { OrderConfirmation } from './order-confirmation';

describe('OrderConfirmation', () => {
  let component: OrderConfirmation;
  let fixture: ComponentFixture<OrderConfirmation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderConfirmation],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        provideTranslateService(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '1' }) } } }
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OrderConfirmation);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('OrderConfirmation — no fake external payment redirect', () => {
  let fixture: ComponentFixture<OrderConfirmation>;
  let component: OrderConfirmation;
  let httpMock: HttpTestingController;

  const payUrl = `${environment.orderApiUrl}/api/orders/555/pay`;

  const orderResponse = {
    success: true,
    message: 'ok',
    data: {
      id: 555, userId: 1, items: [], totalPrice: 650000, status: 'PAID',
      paymentStatus: 'PAID', createdAt: '2026-01-01'
    }
  };

  const fakeRedirectUrlFor: Partial<Record<PaymentMethod, string>> = {
    IDRAM: 'https://sandbox.idram.am/payment?ref=fake&amount=650000&merchant_id=sandbox-merchant',
    TELCELL: 'https://sandbox.telcellwallet.am/payment?ref=fake&amount=650000&merchant_id=sandbox-merchant'
  };

  const setNavState = (paymentMethod: PaymentMethod) => {
    history.pushState(
      { justCheckedOut: true, paymentMethod, paymentRedirectUrl: fakeRedirectUrlFor[paymentMethod] ?? null },
      '',
      '/order-confirmation/555'
    );
  };

  const setup = async () => {
    await TestBed.configureTestingModule({
      imports: [OrderConfirmation],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideTranslateService(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '555' }) } } }
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OrderConfirmation);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  };

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
  });

  const methods: PaymentMethod[] = ['IDRAM', 'TELCELL', 'ROKET_LINE', 'INSTALLMENT', 'CARD'];

  for (const method of methods) {
    it(`never opens an external window for ${method} — goes straight to verifying, then success`, async () => {
      setNavState(method);
      await setup();

      const openSpy = vi.spyOn(window, 'open');

      fixture.detectChanges(); // ngOnInit -> straight to verifyPayment(), no redirecting interstitial

      expect(component.state).toBe('verifying');
      expect(fixture.nativeElement.querySelector('.inline-loading h2').textContent).toContain('VERIFYING_PAYMENT_TITLE');

      httpMock.expectOne(payUrl).flush(orderResponse);
      fixture.detectChanges();

      expect(component.state).toBe('success');
      expect(fixture.nativeElement.querySelector('.result-icon.success')).not.toBeNull();
      expect(openSpy).not.toHaveBeenCalled();
    });
  }

  it('has no leftover redirect mechanism at all — no paymentRedirectUrl field, no openProviderPage method, no "redirecting" case in the template', async () => {
    setNavState('IDRAM');
    await setup();
    fixture.detectChanges();
    httpMock.expectOne(payUrl).flush(orderResponse);
    fixture.detectChanges();

    expect((component as unknown as Record<string, unknown>)['paymentRedirectUrl']).toBeUndefined();
    expect((component as unknown as Record<string, unknown>)['openProviderPage']).toBeUndefined();
    expect(fixture.nativeElement.textContent).not.toContain('REDIRECTING_TO_PAYMENT_TITLE');
  });
});

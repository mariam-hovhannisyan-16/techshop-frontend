import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../services/toast';
import { OrderResponse } from '../../services/order';

import { OrderDetails } from './order-details';

describe('OrderDetails', () => {
  let component: OrderDetails;
  let fixture: ComponentFixture<OrderDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderDetails],
      providers: [provideHttpClient(), provideRouter([]), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(OrderDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('OrderDetails — cancel order', () => {
  let fixture: ComponentFixture<OrderDetails>;
  let component: OrderDetails;
  let httpMock: HttpTestingController;
  let toastService: ToastService;

  const orderId = 42;
  const ordersUrl = `${environment.orderApiUrl}/api/orders`;

  const baseOrder: OrderResponse = {
    id: orderId,
    userId: 1,
    items: [],
    totalPrice: 100000,
    status: 'PAID',
    createdAt: '2026-01-01T10:00:00Z'
  };

  const fakeJwt = (payload: object) => `h.${btoa(JSON.stringify(payload))}.s`;
  const nativeElement = (): HTMLElement => fixture.nativeElement;
  const cancelBtn = () => nativeElement().querySelector<HTMLButtonElement>('.cancel-order-btn');

  const drainLeftover = () => {
    let leftover = httpMock.match(() => true);
    while (leftover.length) {
      leftover.forEach(req => req.flush({ success: true, message: 'ok', data: [] }));
      leftover = httpMock.match(() => true);
    }
  };

  const setup = async (order: OrderResponse) => {
    localStorage.clear();
    localStorage.setItem('token', fakeJwt({ userId: 1, role: 'CUSTOMER' }));

    await TestBed.configureTestingModule({
      imports: [OrderDetails],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideTranslateService(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: String(orderId) }) } } }
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OrderDetails);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    toastService = TestBed.inject(ToastService);

    fixture.detectChanges();
    httpMock.expectOne(`${ordersUrl}/${orderId}`).flush({ success: true, message: 'ok', data: order });
    drainLeftover();
    fixture.detectChanges();
  };

  afterEach(() => {
    drainLeftover();
    httpMock.verify();
  });

  it('shows the cancel button for a cancellable order (e.g. PAID)', async () => {
    await setup({ ...baseOrder, status: 'PAID' });
    expect(cancelBtn()).not.toBeNull();
  });

  it('hides the cancel button for a non-cancellable order (e.g. SHIPPED)', async () => {
    await setup({ ...baseOrder, status: 'SHIPPED' });
    expect(cancelBtn()).toBeNull();
  });

  it('hides the cancel button for an already-cancelled order', async () => {
    await setup({ ...baseOrder, status: 'CANCELLED' });
    expect(cancelBtn()).toBeNull();
  });

  it('does not call the cancel endpoint when the confirmation dialog is declined', async () => {
    await setup({ ...baseOrder, status: 'PAID' });
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    cancelBtn()!.click();

    httpMock.expectNone(`${ordersUrl}/${orderId}/cancel`);
  });

  it('calls PATCH /api/orders/{id}/cancel after confirmation and updates the UI on success', async () => {
    await setup({ ...baseOrder, status: 'PAID' });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(toastService, 'show');

    cancelBtn()!.click();

    const req = httpMock.expectOne(`${ordersUrl}/${orderId}/cancel`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ success: true, message: 'ok', data: { ...baseOrder, status: 'CANCELLED' } });
    fixture.detectChanges();

    expect(component.order?.status).toBe('CANCELLED');
    expect(toastService.show).toHaveBeenCalledWith(expect.any(String), 'success');
    expect(cancelBtn()).toBeNull();
  });

  it('shows an error toast and keeps the order status unchanged when cancellation fails', async () => {
    await setup({ ...baseOrder, status: 'PAID' });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(toastService, 'show');

    cancelBtn()!.click();

    const req = httpMock.expectOne(`${ordersUrl}/${orderId}/cancel`);
    req.flush({ success: false, message: 'error' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(toastService.show).toHaveBeenCalledWith(expect.any(String), 'error');
    expect(component.order?.status).toBe('PAID');
    expect(cancelBtn()).not.toBeNull();
  });
});

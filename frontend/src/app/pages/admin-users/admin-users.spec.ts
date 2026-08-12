import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';

import { AdminUsers } from './admin-users';

describe('AdminUsers', () => {
  let fixture: ComponentFixture<AdminUsers>;
  let component: AdminUsers;
  let httpMock: HttpTestingController;

  const usersUrl = `${environment.usersApiUrl}/api/users`;
  const ordersAdminUrl = `${environment.orderApiUrl}/api/orders/admin`;

  const mockUsers = [
    { id: 1, name: 'Oldest User', email: 'oldest@example.com', role: 'CUSTOMER', createdAt: '2026-01-01T10:00:00' },
    { id: 2, name: 'Newest User', email: 'newest@example.com', role: 'CUSTOMER', createdAt: '2026-06-01T10:00:00' },
    { id: 3, name: 'No Date User', email: 'nodate@example.com', role: 'CUSTOMER', createdAt: null },
    { id: 4, name: 'Middle User', email: 'middle@example.com', role: 'ADMIN', createdAt: '2026-03-01T10:00:00' },
  ];

  const setup = async () => {
    localStorage.clear();
    localStorage.setItem('token', 'fake-token');
    localStorage.setItem('user', JSON.stringify({ id: 99, role: 'ADMIN' }));

    await TestBed.configureTestingModule({
      imports: [AdminUsers],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminUsers);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    fixture.detectChanges();
    httpMock.expectOne(usersUrl).flush({ success: true, message: 'ok', data: mockUsers });
    fixture.detectChanges();
  };

  afterEach(() => httpMock.verify());

  describe('registration date', () => {
    beforeEach(setup);

    it('sorts users newest-first by createdAt, with no-date users last', () => {
      expect(component.users.map(u => u.id)).toEqual([2, 4, 1, 3]);
    });

    it('renders the registration date column, with a placeholder for users with no createdAt', () => {
      const rows = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(rows[0].querySelector('.registered-cell').textContent).toContain('2026');
      expect(rows[3].querySelector('.registered-cell').textContent.trim()).toBe('—');
    });
  });

  describe('per-user order history', () => {
    beforeEach(setup);

    it('fetches and displays a user\'s real order history scoped by userId via the admin endpoint', () => {
      component.viewOrders(mockUsers[1] as any);

      const req = httpMock.expectOne(r => r.url === ordersAdminUrl && r.params.get('userId') === '2');
      req.flush({
        success: true,
        message: 'ok',
        data: {
          content: [
            { id: 10, userId: 2, items: [{ productId: 1, productName: 'iPhone 15', productPrice: 450000, quantity: 1, totalPrice: 450000 }], totalPrice: 450000, status: 'PAID', createdAt: '2026-05-01T12:00:00' }
          ],
          totalElements: 1,
          totalPages: 1
        }
      });
      fixture.detectChanges();

      expect(component.ordersModalOrders.length).toBe(1);
      expect(component.ordersModalOrders[0].id).toBe(10);
      expect(component.ordersModalLoading).toBe(false);
    });

    it('renders the payment method for each order in the modal', () => {
      component.viewOrders(mockUsers[1] as any);

      httpMock.expectOne(r => r.url === ordersAdminUrl && r.params.get('userId') === '2').flush({
        success: true,
        message: 'ok',
        data: {
          content: [
            { id: 11, userId: 2, items: [{ productId: 1, productName: 'iPhone 15', productPrice: 450000, quantity: 1, totalPrice: 450000 }], totalPrice: 450000, status: 'PAID', paymentMethod: 'IDRAM', createdAt: '2026-05-01T12:00:00' }
          ],
          totalElements: 1,
          totalPages: 1
        }
      });
      fixture.detectChanges();

      const modalText = fixture.nativeElement.querySelector('.orders-modal').textContent;
      expect(modalText).toContain('PAYMENT_IDRAM');
    });

    it('does not fake order data client-side on failure — surfaces a real error instead', () => {
      component.viewOrders(mockUsers[1] as any);

      const req = httpMock.expectOne(r => r.url === ordersAdminUrl);
      req.flush({ error: 'Server Error' }, { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();

      expect(component.ordersModalError).toBe('ADMIN_FAILED_TO_LOAD_USER_ORDERS');
      expect(component.ordersModalOrders.length).toBe(0);
    });

    it('closes the modal and clears its state', () => {
      component.viewOrders(mockUsers[1] as any);
      httpMock.expectOne(r => r.url === ordersAdminUrl).flush({ success: true, message: 'ok', data: { content: [], totalElements: 0, totalPages: 0 } });

      component.closeOrdersModal();

      expect(component.ordersModalUser).toBeNull();
      expect(component.ordersModalOrders.length).toBe(0);
    });
  });

  describe('order status changes', () => {
    beforeEach(setup);

    it('only offers the statuses the backend actually allows next, per current status', () => {
      expect(component.nextStatusOptions({ status: 'PENDING' } as any)).toEqual(['PAID', 'CANCELLED']);
      expect(component.nextStatusOptions({ status: 'PAID' } as any)).toEqual(['PROCESSING', 'CANCELLED', 'REFUNDED']);
      expect(component.nextStatusOptions({ status: 'PROCESSING' } as any)).toEqual(['SHIPPED', 'CANCELLED']);
      expect(component.nextStatusOptions({ status: 'SHIPPED' } as any)).toEqual(['DELIVERED']);
      expect(component.nextStatusOptions({ status: 'DELIVERED' } as any)).toEqual(['REFUNDED']);
      expect(component.nextStatusOptions({ status: 'CANCELLED' } as any)).toEqual([]);
      expect(component.nextStatusOptions({ status: 'REFUNDED' } as any)).toEqual([]);
    });

    it('calls the admin status endpoint and reflects the confirmed new status from the response, not optimistically', () => {
      const order = { id: 20, userId: 2, items: [], totalPrice: 100, status: 'PAID', createdAt: '2026-05-01T12:00:00' } as any;

      component.updateOrderStatus(order, 'PROCESSING');

      const req = httpMock.expectOne(`${ordersAdminUrl}/20/status`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ status: 'PROCESSING', note: undefined });

      req.flush({ success: true, message: 'ok', data: { ...order, status: 'PROCESSING' } });

      expect(order.status).toBe('PROCESSING');
      expect(component.updatingOrderStatusId).toBeNull();
    });

    it('surfaces the backend\'s real rejection message for an invalid transition instead of a generic error', () => {
      const order = { id: 21, userId: 2, items: [], totalPrice: 100, status: 'PAID', createdAt: '2026-05-01T12:00:00' } as any;

      component.updateOrderStatus(order, 'SHIPPED');

      const req = httpMock.expectOne(`${ordersAdminUrl}/21/status`);
      req.flush({ error: 'Error', message: 'Cannot transition order from PAID to SHIPPED', status: 409 }, { status: 409, statusText: 'Conflict' });

      expect(order.status).toBe('PAID');
      expect(component.updatingOrderStatusId).toBeNull();
    });

    it('ignores a second status-change attempt while one is already in flight', () => {
      const order = { id: 22, userId: 2, items: [], totalPrice: 100, status: 'PAID', createdAt: '2026-05-01T12:00:00' } as any;

      component.updateOrderStatus(order, 'PROCESSING');
      component.updateOrderStatus(order, 'CANCELLED');

      httpMock.expectOne(`${ordersAdminUrl}/22/status`).flush({ success: true, message: 'ok', data: { ...order, status: 'PROCESSING' } });
    });
  });
});

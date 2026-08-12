import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';

import { AdminStats } from './admin-stats';

describe('AdminStats', () => {
  let fixture: ComponentFixture<AdminStats>;
  let component: AdminStats;
  let httpMock: HttpTestingController;

  const statisticsUrl = `${environment.orderApiUrl}/api/orders/admin/statistics`;
  const ordersAdminUrl = `${environment.orderApiUrl}/api/orders/admin`;
  const usersUrl = `${environment.usersApiUrl}/api/users`;

  const flushWith = (orders: any[]) => {
    fixture.detectChanges();
    httpMock.expectOne(statisticsUrl).flush({
      success: true, message: 'ok',
      data: { totalOrders: orders.length, totalRevenue: orders.reduce((s, o) => s + o.totalPrice, 0), averageOrderValue: 0, ordersByStatus: {} }
    });
    httpMock.expectOne(r => r.url.startsWith(ordersAdminUrl)).flush({
      success: true, message: 'ok',
      data: { content: orders, pageNumber: 0, pageSize: 100, totalElements: orders.length, totalPages: 1 }
    });
    httpMock.expectOne(usersUrl).flush({ success: true, message: 'ok', data: [{ id: 1 }, { id: 2 }] });
    fixture.detectChanges();
  };

  const setupComponent = async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AdminStats],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminStats);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  };

  afterEach(() => httpMock.verify());

  describe('top-selling products bar chart', () => {
    const orders = [
      { id: 1, userId: 1, status: 'PAID', totalPrice: 100000, createdAt: '2026-08-10T10:00:00', items: [{ productId: 1, productName: 'iPhone', productPrice: 100000, quantity: 3, totalPrice: 300000 }] },
      { id: 2, userId: 1, status: 'PAID', totalPrice: 50000, createdAt: '2026-08-10T11:00:00', items: [{ productId: 2, productName: 'MacBook', productPrice: 50000, quantity: 1, totalPrice: 50000 }] },
    ];

    beforeEach(async () => {
      await setupComponent();
      flushWith(orders);
    });

    it('scales bar widths relative to the top seller', () => {
      expect(component.topProductsMax).toBe(3);
      expect(component.barWidthPercent(3)).toBe(100);
      expect(component.barWidthPercent(1)).toBe(33);
    });

    it('renders one bar row per top product with the real quantity sold', () => {
      const rows = fixture.nativeElement.querySelectorAll('.bar-row');
      expect(rows.length).toBe(2);
      expect(rows[0].textContent).toContain('iPhone');
      expect(rows[0].querySelector('.bar-row-fill').style.width).toBe('100%');
    });
  });

  describe('revenue trend chart — only renders with enough real days of data', () => {
    it('does not render the trend chart when orders only span 1-2 distinct days (matches current real data)', async () => {
      await setupComponent();
      flushWith([
        { id: 1, userId: 1, status: 'PAID', totalPrice: 100000, createdAt: '2026-08-10T10:00:00', items: [] },
        { id: 2, userId: 1, status: 'PAID', totalPrice: 50000, createdAt: '2026-08-11T11:00:00', items: [] },
      ]);

      expect(component.hasTrendChart).toBe(false);
      expect(fixture.nativeElement.querySelector('.trend-chart-card')).toBeNull();
    });

    it('renders the trend chart once orders span at least 3 distinct days, scaled by revenue', async () => {
      await setupComponent();
      flushWith([
        { id: 1, userId: 1, status: 'PAID', totalPrice: 100000, createdAt: '2026-08-09T10:00:00', items: [] },
        { id: 2, userId: 1, status: 'PAID', totalPrice: 200000, createdAt: '2026-08-10T10:00:00', items: [] },
        { id: 3, userId: 1, status: 'PAID', totalPrice: 50000, createdAt: '2026-08-10T12:00:00', items: [] },
        { id: 4, userId: 1, status: 'PAID', totalPrice: 400000, createdAt: '2026-08-11T10:00:00', items: [] },
      ]);

      expect(component.hasTrendChart).toBe(true);
      expect(component.stats?.ordersByDay.length).toBe(3);
      const aug10 = component.stats?.ordersByDay.find(d => d.date === '2026-08-10');
      expect(aug10?.revenue).toBe(250000);
      expect(aug10?.orderCount).toBe(2);

      expect(component.ordersByDayMax).toBe(400000);
      expect(component.columnHeightPercent(400000)).toBe(100);

      const columns = fixture.nativeElement.querySelectorAll('.column');
      expect(columns.length).toBe(3);
    });
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';

import { AdminReviews } from './admin-reviews';

describe('AdminReviews', () => {
  let fixture: ComponentFixture<AdminReviews>;
  let component: AdminReviews;
  let httpMock: HttpTestingController;

  const productsUrl = `${environment.productApiUrl}/api/products`;
  const usersUrl = `${environment.usersApiUrl}/api/users`;
  const reviewsUrl = `${environment.orderApiUrl}/api/reviews`;

  const mockProducts = [
    { id: 1, name: 'iPhone 15', description: '', price: 450000, quantity: 5, category: 'Phones' },
    { id: 2, name: 'MacBook Air', description: '', price: 650000, quantity: 3, category: 'Laptops' },
  ];
  const mockUsers = [
    { id: 13, name: 'Review Tester', email: 'r@example.com', role: 'CUSTOMER', createdAt: null },
    { id: 14, name: 'QA Tester', email: 'qa@example.com', role: 'CUSTOMER', createdAt: null },
  ];

  const setup = async () => {
    localStorage.clear();
    localStorage.setItem('token', 'fake-token');

    await TestBed.configureTestingModule({
      imports: [AdminReviews],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminReviews);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    fixture.detectChanges();
    httpMock.expectOne(productsUrl).flush({ success: true, message: 'ok', data: mockProducts });
    httpMock.expectOne(usersUrl).flush({ success: true, message: 'ok', data: mockUsers });
  };

  const drainLeftover = () => {
    let leftover = httpMock.match(() => true);
    while (leftover.length) {
      leftover.forEach(r => r.flush({ success: true, message: 'ok', data: [] }));
      leftover = httpMock.match(() => true);
    }
  };

  afterEach(() => httpMock.verify());

  it('aggregates real reviews across every product (no admin/all-reviews endpoint exists) and resolves reviewer/product names', async () => {
    await setup();

    const req1 = httpMock.expectOne(r => r.url === reviewsUrl && r.params.get('productId') === '1');
    req1.flush({
      success: true, message: 'ok',
      data: { content: [{ id: 3, productId: 1, userId: 13, rating: 5, comment: 'Great phone, fast delivery!', createdAt: '2026-08-10T09:52:16' }], pageNumber: 0, pageSize: 100, totalElements: 1, totalPages: 1 }
    });
    const req2 = httpMock.expectOne(r => r.url === reviewsUrl && r.params.get('productId') === '2');
    req2.flush({ success: true, message: 'ok', data: { content: [], pageNumber: 0, pageSize: 100, totalElements: 0, totalPages: 0 } });

    fixture.detectChanges();
    drainLeftover();

    expect(component.reviews.length).toBe(1);
    expect(component.reviews[0].reviewerName).toBe('Review Tester');
    expect(component.reviews[0].productName).toBe('iPhone 15');
    expect(component.reviews[0].rating).toBe(5);
    expect(component.reviews[0].comment).toBe('Great phone, fast delivery!');
  });

  it('does not let one product\'s failed review fetch break the whole aggregated list', async () => {
    await setup();

    const req1 = httpMock.expectOne(r => r.url === reviewsUrl && r.params.get('productId') === '1');
    req1.flush({ error: 'Server Error' }, { status: 500, statusText: 'Server Error' });
    const req2 = httpMock.expectOne(r => r.url === reviewsUrl && r.params.get('productId') === '2');
    req2.flush({
      success: true, message: 'ok',
      data: { content: [{ id: 8, productId: 2, userId: 14, rating: 4, comment: 'Solid laptop', createdAt: '2026-08-01T00:00:00' }], pageNumber: 0, pageSize: 100, totalElements: 1, totalPages: 1 }
    });
    fixture.detectChanges();
    drainLeftover();

    expect(component.errorMessage).toBe('');
    expect(component.reviews.length).toBe(1);
    expect(component.reviews[0].productName).toBe('MacBook Air');
  });
});

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { environment } from '../../environments/environment';

import { ReviewsService } from './reviews';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let httpMock: HttpTestingController;

  const apiUrl = `${environment.orderApiUrl}/api/reviews`;
  const fakeJwt = (payload: object) => `h.${btoa(JSON.stringify(payload))}.s`;

  const pageResponse = (content: unknown[]) => ({
    success: true,
    message: 'ok',
    data: { content, pageNumber: 0, pageSize: 100, totalElements: content.length, totalPages: 1 }
  });

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideTranslateService()]
    });
    service = TestBed.inject(ReviewsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getReviews requests the real backend with productId and unwraps the paged content', () => {
    let result: unknown;
    service.getReviews(42).subscribe(reviews => result = reviews);

    const req = httpMock.expectOne(r => r.url === apiUrl && r.params.get('productId') === '42');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('size')).toBe('100');

    const reviews = [
      { id: 1, productId: 42, userId: 9, rating: 5, comment: 'Great!', createdAt: '2026-01-01T00:00:00' }
    ];
    req.flush(pageResponse(reviews));

    expect(result).toEqual(reviews);
  });

  it('getAverageRating computes the mean of the fetched reviews', () => {
    let result: number | undefined;
    service.getAverageRating(7).subscribe(avg => result = avg);

    const req = httpMock.expectOne(r => r.url === apiUrl && r.params.get('productId') === '7');
    req.flush(pageResponse([
      { id: 1, productId: 7, userId: 1, rating: 4, comment: 'a', createdAt: '2026-01-01T00:00:00' },
      { id: 2, productId: 7, userId: 2, rating: 2, comment: 'b', createdAt: '2026-01-01T00:00:00' }
    ]));

    expect(result).toBe(3);
  });

  it('getAverageRating returns 0 for a product with no reviews', () => {
    let result: number | undefined;
    service.getAverageRating(8).subscribe(avg => result = avg);

    httpMock.expectOne(r => r.url === apiUrl && r.params.get('productId') === '8').flush(pageResponse([]));

    expect(result).toBe(0);
  });

  it('createReview POSTs to the real backend with the JWT and the exact request shape', () => {
    localStorage.setItem('token', fakeJwt({ userId: 9, role: 'CUSTOMER' }));

    let result: unknown;
    service.createReview({ productId: 42, rating: 5, comment: 'Great product' }).subscribe(res => result = res);

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${fakeJwt({ userId: 9, role: 'CUSTOMER' })}`);
    expect(req.request.body).toEqual({ productId: 42, rating: 5, comment: 'Great product' });

    const created = { id: 99, productId: 42, userId: 9, rating: 5, comment: 'Great product', createdAt: '2026-01-01T00:00:00' };
    req.flush({ success: true, message: 'ok', data: created });

    expect(result).toEqual({ success: true, message: 'ok', data: created });
  });
});

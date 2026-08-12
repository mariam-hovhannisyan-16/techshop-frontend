import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';

import { ProductDetail } from './product-detail';

describe('ProductDetail', () => {
  let component: ProductDetail;
  let fixture: ComponentFixture<ProductDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductDetail],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        provideTranslateService(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '1001' }) } } }
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('ProductDetail — real-backend reviews with purchase gating', () => {
  let fixture: ComponentFixture<ProductDetail>;
  let component: ProductDetail;
  let httpMock: HttpTestingController;

  const productUrl = `${environment.productApiUrl}/api/products/1001`;
  const allProductsUrl = `${environment.productApiUrl}/api/products`;
  const reviewsUrl = `${environment.orderApiUrl}/api/reviews`;
  const ordersUrl = `${environment.orderApiUrl}/api/orders`;

  const fakeJwt = (payload: object) => `h.${btoa(JSON.stringify(payload))}.s`;
  const token = fakeJwt({ userId: 36, role: 'CUSTOMER' });

  const productResponse = {
    success: true, message: 'ok',
    data: { id: 1001, name: 'iPhone 15 Pro', description: 'Flagship phone', price: 650000, quantity: 5, imageUrl: '/img.jpg' }
  };

  const emptyReviewsPage = { success: true, message: 'ok', data: { content: [], pageNumber: 0, pageSize: 100, totalElements: 0, totalPages: 1 } };

  const drainLeftover = (httpMock: HttpTestingController) => {
    let leftover = httpMock.match(() => true);
    while (leftover.length) {
      leftover.forEach(req => req.flush({ success: true, message: 'ok', data: [] }));
      leftover = httpMock.match(() => true);
    }
  };

  const flushBothReviewRequests = (httpMock: HttpTestingController) => {
    const reqs = httpMock.match(r => r.url === reviewsUrl);
    expect(reqs.length).toBe(2);
    reqs.forEach(r => r.flush(emptyReviewsPage));
  };

  const setup = async () => {
    await TestBed.configureTestingModule({
      imports: [ProductDetail],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideTranslateService(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '1001' }) } } }
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductDetail);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  };

  afterEach(() => httpMock.verify());

  describe('user has a verified purchase of this product', () => {
    beforeEach(async () => {
      localStorage.clear();
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({ id: 36, name: 'Reviewer', email: 'reviewer@example.com', role: 'CUSTOMER', createdAt: '2026-01-01' }));

      await setup();
      fixture.detectChanges();

      httpMock.expectOne(productUrl).flush(productResponse);
      httpMock.expectOne(allProductsUrl).flush({ success: true, message: 'ok', data: [] });
      flushBothReviewRequests(httpMock);
      httpMock.expectOne(ordersUrl).flush({
        success: true, message: 'ok',
        data: [{
          id: 5, userId: 36, status: 'DELIVERED',
          items: [{ productId: 1001, productName: 'iPhone 15 Pro', productPrice: 650000, quantity: 1, totalPrice: 650000 }],
          totalPrice: 650000, createdAt: '2026-01-01'
        }]
      });
      drainLeftover(httpMock);
      fixture.detectChanges();
    });

    it('shows the review form', () => {
      expect(component.hasPurchased).toBe(true);
      expect(component.canShowReviewForm).toBe(true);
      expect(fixture.nativeElement.querySelector('.review-form')).not.toBeNull();
    });

    it('disables the submit button until a rating and comment are both provided, then submits and prepends the new review', () => {
      const nativeElement: HTMLElement = fixture.nativeElement;
      const submitBtn = nativeElement.querySelector<HTMLButtonElement>('.submit-review-btn')!;
      expect(submitBtn.disabled).toBe(true);

      // Pick 4 stars via the real star buttons a user would click.
      const stars = nativeElement.querySelectorAll<HTMLButtonElement>('.rating-star');
      stars[3].click();
      fixture.detectChanges();
      expect(component.newReviewRating).toBe(4);
      expect(submitBtn.disabled).toBe(true); // still no comment

      const textarea = nativeElement.querySelector<HTMLTextAreaElement>('.review-comment-input')!;
      textarea.value = 'Great phone, fast delivery!';
      textarea.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(submitBtn.disabled).toBe(false);

      submitBtn.click();
      const req = httpMock.expectOne(reviewsUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ productId: 1001, rating: 4, comment: 'Great phone, fast delivery!' });
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);

      req.flush({
        success: true, message: 'ok',
        data: { id: 501, productId: 1001, userId: 36, rating: 4, comment: 'Great phone, fast delivery!', createdAt: '2026-08-10T00:00:00' }
      });
      fixture.detectChanges();

      expect(component.reviews[0].id).toBe(501);
      expect(component.newReviewComment).toBe('');
      expect(component.newReviewRating).toBe(0);
      expect(nativeElement.querySelector('.toast.success .toast-message')?.textContent).toContain('TOAST_REVIEW_SUBMITTED');
    });

    it('shows a clear "already reviewed" message and hides the form on a 409, without pretending it worked', () => {
      const nativeElement: HTMLElement = fixture.nativeElement;
      component.setReviewRating(5);
      component.newReviewComment = 'Trying to review twice';
      fixture.detectChanges();

      nativeElement.querySelector<HTMLButtonElement>('.submit-review-btn')!.click();
      httpMock.expectOne(reviewsUrl).flush(
        { error: 'Error', message: 'You have already reviewed this product', status: 409 },
        { status: 409, statusText: 'Conflict' }
      );
      fixture.detectChanges();

      expect(component.alreadyReviewed).toBe(true);
      expect(component.canShowReviewForm).toBe(false);
      expect(nativeElement.querySelector('.review-form')).toBeNull();
      expect(nativeElement.textContent).toContain('REVIEW_ALREADY_SUBMITTED');
    });

    it('shows a clear 403 message and re-hides the form if the backend rejects a submission as unpurchased', () => {
      const nativeElement: HTMLElement = fixture.nativeElement;
      component.setReviewRating(3);
      component.newReviewComment = 'Should not have been allowed';
      fixture.detectChanges();

      nativeElement.querySelector<HTMLButtonElement>('.submit-review-btn')!.click();
      httpMock.expectOne(reviewsUrl).flush(
        { error: 'Error', message: 'You can only review products you have purchased', status: 403 },
        { status: 403, statusText: 'Forbidden' }
      );
      fixture.detectChanges();

      expect(component.hasPurchased).toBe(false);
      expect(component.canShowReviewForm).toBe(false);
      expect(nativeElement.querySelector('.review-form')).toBeNull();
      expect(nativeElement.textContent).toContain('REVIEW_NOT_PURCHASED');
    });
  });

  describe('user has not purchased this product', () => {
    beforeEach(async () => {
      localStorage.clear();
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({ id: 36, name: 'Reviewer', email: 'reviewer@example.com', role: 'CUSTOMER', createdAt: '2026-01-01' }));

      await setup();
      fixture.detectChanges();

      httpMock.expectOne(productUrl).flush(productResponse);
      httpMock.expectOne(allProductsUrl).flush({ success: true, message: 'ok', data: [] });
      flushBothReviewRequests(httpMock);
      httpMock.expectOne(ordersUrl).flush({ success: true, message: 'ok', data: [] }); // no orders at all
      drainLeftover(httpMock);
      fixture.detectChanges();
    });

    it('does not show the review form, and never issues a POST to /api/reviews', () => {
      expect(component.hasPurchased).toBe(false);
      expect(component.canShowReviewForm).toBe(false);
      expect(fixture.nativeElement.querySelector('.review-form')).toBeNull();
      httpMock.expectNone(reviewsUrl);
    });
  });

  describe('logged-out visitor', () => {
    beforeEach(async () => {
      localStorage.clear();
      await setup();
      fixture.detectChanges();

      httpMock.expectOne(productUrl).flush(productResponse);
      httpMock.expectOne(allProductsUrl).flush({ success: true, message: 'ok', data: [] });
      flushBothReviewRequests(httpMock);
      // No orders request should fire at all — there's no token to check eligibility with.
      drainLeftover(httpMock);
      fixture.detectChanges();
    });

    it('never checks purchase history and never shows the review form', () => {
      httpMock.expectNone(ordersUrl);
      expect(component.canShowReviewForm).toBe(false);
      expect(fixture.nativeElement.querySelector('.review-form')).toBeNull();
    });
  });
});

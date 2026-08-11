import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideTranslateService } from '@ngx-translate/core';

import { Product } from './product';
import { environment } from '../../environments/environment';

describe('Product', () => {
  let service: Product;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideTranslateService()] });
    service = TestBed.inject(Product);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

describe('Product — badge derivation from backend isNew', () => {
  let service: Product;
  let httpMock: HttpTestingController;
  const productsUrl = `${environment.productApiUrl}/api/products`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideTranslateService()]
    });
    service = TestBed.inject(Product);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('maps a real backend product with isNew:true to a "new" badge', () => {
    let result: { data: { badge?: string }[] } | undefined;
    service.getAllProducts().subscribe(response => { result = response; });

    httpMock.expectOne(productsUrl).flush({
      success: true,
      message: 'ok',
      data: {
        content: [
          { id: 7, name: 'iPhone 17 Pro', description: '', price: 620000, stock: 18, category: 'Phones', imageUrl: '/img.webp', isNew: true },
          { id: 999, name: 'Old Stock Item', description: '', price: 1000, stock: 1, category: 'Accessories', imageUrl: '/img.webp', isNew: false }
        ],
        pageNumber: 0,
        totalPages: 1
      }
    });

    expect(result?.data[0].badge).toBe('new');
    expect(result?.data[1].badge).toBeUndefined();
  });
});

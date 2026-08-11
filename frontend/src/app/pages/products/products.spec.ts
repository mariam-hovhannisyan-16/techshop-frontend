import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';

import { Products } from './products';

describe('Products', () => {
  let component: Products;
  let fixture: ComponentFixture<Products>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Products],
      providers: [provideHttpClient(), provideRouter([]), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(Products);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('Products — price range filter', () => {
  let fixture: ComponentFixture<Products>;
  let component: Products;
  let httpMock: HttpTestingController;

  const productsUrl = `${environment.productApiUrl}/api/products`;

  // Prices in raw AMD, matching what the backend/service store. localStorage is cleared in
  // beforeEach so LanguageService defaults to 'hy' (AMD, amdPerUnit 1) — these numbers can be
  // compared directly against component.minPrice/maxPrice without any currency conversion.
  const mockProducts = [
    { id: 1, name: 'Cheap Phone', description: 'iphone budget model', price: 40000, quantity: 5 },
    { id: 2, name: 'Mid Phone', description: 'iphone midrange model', price: 200000, quantity: 5 },
    { id: 3, name: 'Expensive Laptop', description: 'macbook pro laptop', price: 800000, quantity: 5 },
    { id: 4, name: 'Budget Headphones', description: 'earbud basic', price: 15000, quantity: 5 },
  ];

  const drainLeftover = () => {
    let leftover = httpMock.match(() => true);
    while (leftover.length) {
      leftover.forEach(req => req.flush({ success: true, message: 'ok', data: [] }));
      leftover = httpMock.match(() => true);
    }
  };

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [Products],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(Products);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    fixture.detectChanges(); // ngOnInit -> loadProducts()
    httpMock.expectOne(productsUrl).flush({ success: true, message: 'ok', data: mockProducts });
    drainLeftover(); // header badges' own eager refreshes
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('shows every product when no price bound is set', () => {
    expect(component.filteredProducts.map(p => p.id).sort()).toEqual([1, 2, 3, 4]);
  });

  it('still renders the shared trust-badges component (kept here, removed from cart)', () => {
    expect(fixture.nativeElement.querySelector('app-trust-badges')).not.toBeNull();
  });

  it('narrows to products within [min, max], inclusive on both ends', () => {
    component.minPrice = 20000;
    component.maxPrice = 200000;
    component.applyFilters();
    fixture.detectChanges();

    expect(component.filteredProducts.map(p => p.id).sort()).toEqual([1, 2]);
  });

  it('supports an open-ended range with only min or only max set', () => {
    component.minPrice = 500000;
    component.applyFilters();
    fixture.detectChanges();
    expect(component.filteredProducts.map(p => p.id)).toEqual([3]);

    component.minPrice = null;
    component.maxPrice = 20000;
    component.applyFilters();
    fixture.detectChanges();
    expect(component.filteredProducts.map(p => p.id)).toEqual([4]);
  });

  it('composes with the category filter — both narrow the result set together', () => {
    component.selectCategory('phones'); // matches id 1 and 2 (both mention "iphone")
    component.minPrice = 100000;
    component.applyFilters();
    fixture.detectChanges();

    expect(component.filteredProducts.map(p => p.id)).toEqual([2]);
  });

  it('clearPriceRange resets bounds to null and restores the rest of the result set (category stays applied)', () => {
    component.selectCategory('phones');
    component.maxPrice = 50000;
    component.applyFilters();
    fixture.detectChanges();
    expect(component.filteredProducts.map(p => p.id)).toEqual([1]);

    component.clearPriceRange();
    fixture.detectChanges();

    expect(component.minPrice).toBeNull();
    expect(component.maxPrice).toBeNull();
    expect(component.filteredProducts.map(p => p.id).sort()).toEqual([1, 2]);
  });

  it('clearFilters (global reset) also clears the price range alongside category/search', () => {
    component.selectCategory('phones');
    component.minPrice = 100000;
    component.applyFilters();
    fixture.detectChanges();

    component.clearFilters();
    fixture.detectChanges();

    expect(component.selectedCategory).toBe('all');
    expect(component.minPrice).toBeNull();
    expect(component.maxPrice).toBeNull();
    expect(component.filteredProducts.length).toBe(4);
  });

  it('renders real min/max price inputs that auto-apply on input, same as category pills auto-apply on click', () => {
    const nativeElement: HTMLElement = fixture.nativeElement;
    const minInput = nativeElement.querySelector<HTMLInputElement>('input[name="minPrice"]');
    const maxInput = nativeElement.querySelector<HTMLInputElement>('input[name="maxPrice"]');
    expect(minInput).not.toBeNull();
    expect(maxInput).not.toBeNull();

    minInput!.value = '100000';
    minInput!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(component.minPrice).toBe(100000);
    expect(component.filteredProducts.map(p => p.id).sort()).toEqual([2, 3]);

    const clearBtn = nativeElement.querySelector<HTMLButtonElement>('.clear-price-btn');
    expect(clearBtn).not.toBeNull();
    clearBtn!.click();
    fixture.detectChanges();

    expect(component.minPrice).toBeNull();
    expect(component.filteredProducts.length).toBe(4);
  });
});

describe('Products — new arrivals surface on the first page', () => {
  let fixture: ComponentFixture<Products>;
  let component: Products;
  let httpMock: HttpTestingController;

  const productsUrl = `${environment.productApiUrl}/api/products`;

  // 8 older phones (fills page 1 at the current pageSize) followed by 2 new
  // arrivals — mirrors the real bug: iPhone 17 Pro/Pro Max had the correct
  // "Phones" category and were included in the filtered count, but the
  // backend's arbitrary ordering placed them on page 2, so a user clicking
  // the Phones tab never saw them without paging.
  const mockProducts = [
    ...Array.from({ length: 8 }, (_, i) => ({
      id: i + 1, name: `Old Phone ${i + 1}`, description: 'iphone', price: 100000, quantity: 5, category: 'Phones'
    })),
    { id: 9, name: 'iPhone 17 Pro', description: 'iphone', price: 620000, quantity: 5, category: 'Phones', isNew: true },
    { id: 10, name: 'iPhone 17 Pro Max', description: 'iphone', price: 690000, quantity: 5, category: 'Phones', isNew: true },
  ];

  const drainLeftover = () => {
    let leftover = httpMock.match(() => true);
    while (leftover.length) {
      leftover.forEach(req => req.flush({ success: true, message: 'ok', data: [] }));
      leftover = httpMock.match(() => true);
    }
  };

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [Products],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(Products);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    fixture.detectChanges();
    httpMock.expectOne(productsUrl).flush({ success: true, message: 'ok', data: mockProducts });
    drainLeftover();
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('puts "new"-badged products on page 1 even when the backend orders them last', () => {
    component.selectCategory('phones');

    expect(component.filteredProducts.length).toBe(10);
    const page1Ids = component.pagedProducts.map(p => p.id);
    expect(page1Ids).toContain(9);
    expect(page1Ids).toContain(10);
  });
});

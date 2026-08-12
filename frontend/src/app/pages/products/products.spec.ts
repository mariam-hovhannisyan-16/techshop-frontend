import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';
import { ProductFiltersPanelService } from '../../services/product-filters-panel';

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

    fixture.detectChanges();
    httpMock.expectOne(productsUrl).flush({ success: true, message: 'ok', data: mockProducts });
    drainLeftover();
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
    component.selectCategory('phones');
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
    TestBed.inject(ProductFiltersPanelService).toggle();
    fixture.detectChanges();

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

  const mockProducts = [
    { id: 5, name: 'Sony WH-1000XM5', description: '', price: 1, quantity: 1, category: 'Audio', isNew: true },
    { id: 1, name: 'iPhone 15, 128GB', description: '', price: 1, quantity: 1, category: 'Phones', isNew: true },
    { id: 2, name: 'Samsung Galaxy S24', description: '', price: 1, quantity: 1, category: 'Phones', isNew: true },
    { id: 68, name: 'MacBook Pro M4', description: '', price: 1, quantity: 1, category: 'Laptops', isNew: true },
    { id: 62, name: 'Steam Deck', description: '', price: 1, quantity: 1, category: 'Games', isNew: true },
    { id: 54, name: 'Huawei P60 Pro', description: '', price: 1, quantity: 1, category: 'Phones', isNew: true },
    { id: 43, name: 'Xiaomi Pad 6', description: '', price: 1, quantity: 1, category: 'Tablets', isNew: true },
    { id: 34, name: 'Xiaomi TV A2 50"', description: '', price: 1, quantity: 1, category: 'TVs', isNew: true },
    { id: 24, name: 'Google Pixel 8', description: '', price: 1, quantity: 1, category: 'Phones', isNew: true },
    { id: 20, name: 'Microsoft Xbox Series X', description: '', price: 1, quantity: 1, category: 'Games', isNew: true },
    { id: 14, name: 'Canon EOS Camera', description: '', price: 1, quantity: 1, category: 'Cameras', isNew: true },
    { id: 8, name: 'iPhone 17 Pro Max', description: '', price: 1, quantity: 1, category: 'Phones', isNew: true },
    { id: 7, name: 'iPhone 17 Pro', description: '', price: 1, quantity: 1, category: 'Phones', isNew: true },
    { id: 100, name: 'Old Case', description: '', price: 1, quantity: 1, category: 'Accessories' },
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

  it('sorts the "new" group by id ascending on the "All products" view so the backend\'s last-listed new items still surface at the top, with every product shown unpaginated', () => {
    expect(component.filteredProducts.length).toBe(14);

    const allIds = component.pagedProducts.map(p => p.id);
    expect(allIds).toEqual([1, 2, 5, 7, 8, 14, 20, 24, 34, 43, 54, 62, 68, 100]);
    expect(allIds).toContain(7);
    expect(allIds).toContain(8);
  });

  it('also puts iPhone 17 Pro/Pro Max first when filtered to the Phones tab, with every match shown unpaginated', () => {
    component.selectCategory('phones');

    const ids = component.pagedProducts.map(p => p.id);
    expect(ids).toContain(7);
    expect(ids).toContain(8);
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { vi } from 'vitest';
import { environment } from '../../../environments/environment';

import { AdminProducts } from './admin-products';

describe('AdminProducts', () => {
  let fixture: ComponentFixture<AdminProducts>;
  let component: AdminProducts;
  let httpMock: HttpTestingController;

  const productsUrl = `${environment.productApiUrl}/api/products`;

  const mockProducts = [
    { id: 1, name: 'Product With Image', description: '', price: 1000, quantity: 1, category: 'Phones', imageUrl: 'https://example.com/img1.jpg' },
    { id: 2, name: 'Product Without Image', description: '', price: 2000, quantity: 1, category: 'Laptops' },
  ];

  const setup = async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AdminProducts],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminProducts);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    fixture.detectChanges(); // ngOnInit -> loadProducts()
    httpMock.expectOne(productsUrl).flush({ success: true, message: 'ok', data: mockProducts });
    fixture.detectChanges();
  };

  afterEach(() => httpMock.verify());

  describe('thumbnails', () => {
    beforeEach(setup);

    it('renders an image for a product with imageUrl', () => {
      const rows = fixture.nativeElement.querySelectorAll('tbody tr');
      const img = rows[0].querySelector('.thumb-cell img');
      expect(img).not.toBeNull();
      expect(img.getAttribute('src')).toBe('https://example.com/img1.jpg');
    });

    it('renders a fallback icon for a product with no imageUrl', () => {
      const rows = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(rows[1].querySelector('.thumb-cell img')).toBeNull();
      expect(rows[1].querySelector('.thumb-cell .thumb-fallback')).not.toBeNull();
    });

    it('falls back to the icon if the image fails to load', () => {
      const rows = fixture.nativeElement.querySelectorAll('tbody tr');
      const img = rows[0].querySelector('.thumb-cell img');
      img.dispatchEvent(new Event('error'));
      fixture.detectChanges();

      const rowsAfter = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(rowsAfter[0].querySelector('.thumb-cell img')).toBeNull();
      expect(rowsAfter[0].querySelector('.thumb-cell .thumb-fallback')).not.toBeNull();
    });
  });

  describe('saveEdit — success only reflects confirmed persistence', () => {
    beforeEach(setup);

    const drainLeftover = () => {
      let leftover = httpMock.match(() => true);
      while (leftover.length) {
        leftover.forEach(r => r.flush({ success: true, message: 'ok', data: [] }));
        leftover = httpMock.match(() => true);
      }
    };

    it('sends the discount update only after the price update has resolved, not in parallel — and never touches the stock endpoint when quantity is unchanged', () => {
      component.startEdit(mockProducts[0] as any);
      component.editState = { price: 1200, discountPercent: 20, quantity: 1 };
      component.saveEdit(mockProducts[0] as any);

      const priceReq = httpMock.expectOne(`${productsUrl}/1/price`);
      expect(httpMock.match(`${productsUrl}/1/discount`).length).toBe(0);

      priceReq.flush({ success: true, message: 'ok', data: { ...mockProducts[0], price: 1200 } });
      httpMock.expectOne(`${productsUrl}/1/discount`).flush({ success: true, message: 'ok', data: { ...mockProducts[0], price: 1200, discountPercentage: 20 } });
      expect(httpMock.match(`${productsUrl}/1/stock`).length).toBe(0);

      httpMock.expectOne(productsUrl).flush({ success: true, message: 'ok', data: [{ ...mockProducts[0], price: 1200, discountPercentage: 20 }, mockProducts[1]] });
      drainLeftover();
    });

    it('shows success only after re-fetching confirms the new price/discount are actually saved', () => {
      component.startEdit(mockProducts[0] as any);
      component.editState = { price: 1200, discountPercent: 20, quantity: 1 };
      component.saveEdit(mockProducts[0] as any);

      const priceReq = httpMock.expectOne(`${productsUrl}/1/price`);
      priceReq.flush({ success: true, message: 'ok', data: { ...mockProducts[0], price: 1200 } });
      const discountReq = httpMock.expectOne(`${productsUrl}/1/discount`);
      discountReq.flush({ success: true, message: 'ok', data: { ...mockProducts[0], price: 1200, discountPercentage: 20 } });

      const refetchReq = httpMock.expectOne(productsUrl);
      refetchReq.flush({
        success: true,
        message: 'ok',
        data: [{ ...mockProducts[0], price: 1200, discountPercentage: 20 }, mockProducts[1]]
      });
      drainLeftover();

      expect(component.editingId).toBeNull();
    });

    it('does not report success if the refetch shows the edit was not actually persisted', () => {
      component.startEdit(mockProducts[0] as any);
      component.editState = { price: 1200, discountPercent: 20, quantity: 1 };
      component.saveEdit(mockProducts[0] as any);

      httpMock.expectOne(`${productsUrl}/1/price`).flush({ success: true, message: 'ok', data: { ...mockProducts[0], price: 1200 } });
      httpMock.expectOne(`${productsUrl}/1/discount`).flush({ success: true, message: 'ok', data: { ...mockProducts[0], price: 1200, discountPercentage: 20 } });

      const refetchReq = httpMock.expectOne(productsUrl);
      refetchReq.flush({ success: true, message: 'ok', data: mockProducts });
      drainLeftover();

      const saved = component.products.find(p => p.id === 1)!;
      expect(component.discountPercentOf(saved)).toBeNull();
    });
  });

  describe('stock toggle', () => {
    beforeEach(setup);

    const drainLeftover = () => {
      let leftover = httpMock.match(() => true);
      while (leftover.length) {
        leftover.forEach(r => r.flush({ success: true, message: 'ok', data: [] }));
        leftover = httpMock.match(() => true);
      }
    };

    it('toggling an in-stock product sets quantity to 0, and toggling back restores a positive default', () => {
      component.startEdit(mockProducts[0] as any); // quantity: 1
      expect(component.editState.quantity).toBe(1);

      component.toggleStock();
      expect(component.editState.quantity).toBe(0);

      component.toggleStock();
      expect(component.editState.quantity).toBeGreaterThan(0);
    });

    it('sends the toggled quantity to PUT /api/products/{id}/stock on save', () => {
      component.startEdit(mockProducts[0] as any);
      component.toggleStock(); // now out of stock
      component.saveEdit(mockProducts[0] as any);

      httpMock.expectOne(`${productsUrl}/1/price`).flush({ success: true, message: 'ok', data: mockProducts[0] });
      httpMock.expectOne(`${productsUrl}/1/discount`).flush({ success: true, message: 'ok', data: mockProducts[0] });

      const stockReq = httpMock.expectOne(`${productsUrl}/1/stock`);
      expect(stockReq.request.method).toBe('PUT');
      expect(stockReq.request.body).toEqual({ quantity: 0 });
      stockReq.flush({ success: true, message: 'ok', data: { ...mockProducts[0], quantity: 0 } });

      httpMock.expectOne(productsUrl).flush({ success: true, message: 'ok', data: [{ ...mockProducts[0], quantity: 0 }, mockProducts[1]] });
      drainLeftover();
    });

    it('rejects a negative stock value client-side instead of sending it to the backend', () => {
      component.startEdit(mockProducts[0] as any);
      component.editState = { price: 1000, discountPercent: null, quantity: -5 };
      component.saveEdit(mockProducts[0] as any);

      expect(httpMock.match(() => true).length).toBe(0);
    });
  });

  describe('discount edit field', () => {
    beforeEach(setup);

    it('selects the pre-filled text on focus, so typing replaces it instead of appending', () => {
      const input = document.createElement('input');
      input.value = '15';
      const event = { target: input } as unknown as Event;
      const selectSpy = vi.spyOn(input, 'select');

      component.selectInputText(event);

      expect(selectSpy).toHaveBeenCalled();
    });

    it('rejects an out-of-range discount client-side instead of sending it to the backend', () => {
      component.startEdit(mockProducts[0] as any);
      component.editState = { price: 1000, discountPercent: 1520, quantity: 1 };
      component.saveEdit(mockProducts[0] as any);

      expect(httpMock.match(() => true).length).toBe(0);
    });
  });

  describe('summary stat tiles — aggregated from the already-loaded product list', () => {
    const statMockProducts = [
      { id: 1, name: 'A', description: '', price: 1000, quantity: 4, category: 'Phones' },
      { id: 2, name: 'B', description: '', price: 900, quantity: 2, category: 'Laptops', discountPercentage: 10 },
      { id: 3, name: 'C', description: '', price: 500, quantity: 0, category: 'Audio' },
      { id: 4, name: 'D', description: '', price: 300, quantity: 0, category: 'Games', discountPercentage: 25 },
    ];

    beforeEach(async () => {
      localStorage.clear();
      await TestBed.configureTestingModule({
        imports: [AdminProducts],
        providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideTranslateService()],
      }).compileComponents();

      fixture = TestBed.createComponent(AdminProducts);
      component = fixture.componentInstance;
      httpMock = TestBed.inject(HttpTestingController);

      fixture.detectChanges();
      httpMock.expectOne(productsUrl).flush({ success: true, message: 'ok', data: statMockProducts });
      fixture.detectChanges();
    });

    it('computes total product count, inventory value, out-of-stock count, and discounted count', () => {
      expect(component.totalProductsCount).toBe(4);
      expect(component.totalInventoryValue).toBe(5800);
      expect(component.outOfStockCount).toBe(2);
      expect(component.discountedCount).toBe(2);
    });

    it('renders the stat tiles above the products table', () => {
      const tiles = fixture.nativeElement.querySelectorAll('app-stat-tile');
      expect(tiles.length).toBe(4);
      const statsRowText = fixture.nativeElement.querySelector('.stats-row').textContent;
      expect(statsRowText).toContain('4'); // total products
      expect(statsRowText).toContain('2'); // out of stock / discounted
    });
  });
});

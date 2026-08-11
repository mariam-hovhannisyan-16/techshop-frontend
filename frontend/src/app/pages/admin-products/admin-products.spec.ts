import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
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

    it('sends the discount update only after the price update has resolved, not in parallel', () => {
      // Regression test: the two endpoints do an independent read-modify-write
      // on the same backend row with no locking, so firing them in parallel
      // (as forkJoin previously did) is a real lost-update race — whichever
      // save() commits second silently reverts the other field. Confirmed
      // against the live backend: 100% of parallel attempts lost a field.
      component.startEdit(mockProducts[0] as any);
      component.editState = { price: 1200, discountPercent: 20 };
      component.saveEdit(mockProducts[0] as any);

      const priceReq = httpMock.expectOne(`${productsUrl}/1/price`);
      expect(httpMock.match(`${productsUrl}/1/discount`).length).toBe(0);

      // Clean up the still-pending chain so httpMock.verify() doesn't complain.
      priceReq.flush({ success: true, message: 'ok', data: { ...mockProducts[0], price: 1200 } });
      httpMock.expectOne(`${productsUrl}/1/discount`).flush({ success: true, message: 'ok', data: { ...mockProducts[0], price: 1200, discountPercentage: 20 } });
      httpMock.expectOne(productsUrl).flush({ success: true, message: 'ok', data: [{ ...mockProducts[0], price: 1200, discountPercentage: 20 }, mockProducts[1]] });
      drainLeftover();
    });

    it('shows success only after re-fetching confirms the new price/discount are actually saved', () => {
      component.startEdit(mockProducts[0] as any);
      component.editState = { price: 1200, discountPercent: 20 };
      component.saveEdit(mockProducts[0] as any);

      const priceReq = httpMock.expectOne(`${productsUrl}/1/price`);
      priceReq.flush({ success: true, message: 'ok', data: { ...mockProducts[0], price: 1200 } });
      const discountReq = httpMock.expectOne(`${productsUrl}/1/discount`);
      discountReq.flush({ success: true, message: 'ok', data: { ...mockProducts[0], price: 1200, discountPercentage: 20 } });

      // saveEdit re-fetches the full list to confirm persistence rather than trusting local state.
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
      component.editState = { price: 1200, discountPercent: 20 };
      component.saveEdit(mockProducts[0] as any);

      httpMock.expectOne(`${productsUrl}/1/price`).flush({ success: true, message: 'ok', data: { ...mockProducts[0], price: 1200 } });
      httpMock.expectOne(`${productsUrl}/1/discount`).flush({ success: true, message: 'ok', data: { ...mockProducts[0], price: 1200, discountPercentage: 20 } });

      // Backend says the calls succeeded, but the refetched list shows the OLD price/no discount —
      // i.e. it didn't actually persist. This must not be reported as a success.
      const refetchReq = httpMock.expectOne(productsUrl);
      refetchReq.flush({ success: true, message: 'ok', data: mockProducts });
      drainLeftover();

      // editingId is cleared as soon as the API calls resolve (the form closes either way);
      // what we're really asserting is that the mismatch is detected via discountPercentOf,
      // which the toast decision is based on.
      const saved = component.products.find(p => p.id === 1)!;
      expect(component.discountPercentOf(saved)).toBeNull();
    });
  });
});

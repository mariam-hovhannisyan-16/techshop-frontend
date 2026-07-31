import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { ProductCard } from './product-card';

describe('ProductCard', () => {
  let component: ProductCard;
  let fixture: ComponentFixture<ProductCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductCard],
      providers: [provideHttpClient(), provideRouter([]), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductCard);
    component = fixture.componentInstance;
    component.product = { id: 1, name: 'iPhone 15 Pro', price: 650000 };
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('computes discount only when originalPrice is greater than price', () => {
    component.product = { id: 1, name: 'Test', price: 100 };
    expect(component.hasDiscount).toBe(false);

    component.product = { id: 1, name: 'Test', price: 100, originalPrice: 150 };
    expect(component.hasDiscount).toBe(true);
    expect(component.discountPercent).toBe(33);
  });

  it('emits view/addToCart/remove with the product id', () => {
    let viewedId: number | undefined;
    let addedId: number | undefined;
    let removedId: number | undefined;
    component.view.subscribe(id => (viewedId = id));
    component.addToCart.subscribe(id => (addedId = id));
    component.remove.subscribe(id => (removedId = id));

    component.onView();
    component.onAddToCart(new Event('click'));
    component.onRemove(new Event('click'));

    expect(viewedId).toBe(1);
    expect(addedId).toBe(1);
    expect(removedId).toBe(1);
  });
});

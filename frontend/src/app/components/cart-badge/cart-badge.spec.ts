import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { CartBadge } from './cart-badge';

describe('CartBadge', () => {
  let component: CartBadge;
  let fixture: ComponentFixture<CartBadge>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CartBadge],
      providers: [provideHttpClient(), provideRouter([]), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(CartBadge);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

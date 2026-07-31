import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { WishlistButton } from './wishlist-button';

describe('WishlistButton', () => {
  let component: WishlistButton;
  let fixture: ComponentFixture<WishlistButton>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WishlistButton],
      providers: [provideHttpClient(), provideRouter([]), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(WishlistButton);
    component = fixture.componentInstance;
    component.productId = 1;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

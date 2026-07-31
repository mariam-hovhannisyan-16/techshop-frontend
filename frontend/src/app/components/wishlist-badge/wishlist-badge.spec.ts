import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { WishlistBadge } from './wishlist-badge';

describe('WishlistBadge', () => {
  let component: WishlistBadge;
  let fixture: ComponentFixture<WishlistBadge>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WishlistBadge],
      providers: [provideHttpClient(), provideRouter([]), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(WishlistBadge);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

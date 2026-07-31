import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { Wishlist } from './wishlist';

describe('Wishlist', () => {
  let component: Wishlist;
  let fixture: ComponentFixture<Wishlist>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Wishlist],
      providers: [provideHttpClient(), provideRouter([]), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(Wishlist);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideTranslateService } from '@ngx-translate/core';

import { TrustBadges } from './trust-badges';

describe('TrustBadges', () => {
  let component: TrustBadges;
  let fixture: ComponentFixture<TrustBadges>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrustBadges],
      providers: [provideHttpClient(), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(TrustBadges);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideTranslateService } from '@ngx-translate/core';

import { PromoBanner } from './promo-banner';

describe('PromoBanner', () => {
  let component: PromoBanner;
  let fixture: ComponentFixture<PromoBanner>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PromoBanner],
      providers: [provideHttpClient(), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(PromoBanner);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('cycles through slides with next/prev', () => {
    expect(component.activeIndex).toBe(0);
    component.next();
    expect(component.activeIndex).toBe(1);
    component.prev();
    expect(component.activeIndex).toBe(0);
    component.prev();
    expect(component.activeIndex).toBe(component.slides.length - 1);
  });

  it('emits ctaClick when the CTA is clicked', () => {
    let emitted = false;
    component.ctaClick.subscribe(() => (emitted = true));
    component.onCtaClick();
    expect(emitted).toBe(true);
  });
});

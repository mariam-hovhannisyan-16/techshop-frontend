import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { Footer } from './footer';

describe('Footer', () => {
  let component: Footer;
  let fixture: ComponentFixture<Footer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Footer],
      providers: [provideHttpClient(), provideRouter([]), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(Footer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows exactly the payment methods actually offered in checkout — Cash, Card, Idram, Telcell, VTB — and nothing else (no Mir)', () => {
    fixture.detectChanges();
    const nativeElement: HTMLElement = fixture.nativeElement;

    const methods = nativeElement.querySelectorAll('.footer-payment-method');
    expect(methods.length).toBe(5);

    const imgSrcs = Array.from(nativeElement.querySelectorAll<HTMLImageElement>('.footer-payment-method img'))
      .map(img => img.getAttribute('src'));
    expect(imgSrcs).toEqual([
      'icons/payment/idram.svg',
      'icons/payment/telcell.svg',
      'icons/payment/vtb.svg',
    ]);

    const text = nativeElement.querySelector('.footer-payment-methods')!.textContent ?? '';
    expect(text).not.toContain('МИР');
    expect(text).not.toContain('Mir');
  });
});

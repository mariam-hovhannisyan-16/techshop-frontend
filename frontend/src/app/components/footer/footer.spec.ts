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

  it('shows the 5-brand payment composite (Mastercard, ArCa, Telcell Wallet, VTB Ապառիկ, МИР) — no Visa/Idram/Amex/MyAmeria', () => {
    fixture.detectChanges();
    const img: HTMLImageElement = fixture.nativeElement.querySelector('.footer-payments-badges');
    expect(img).not.toBeNull();
    expect(img.getAttribute('src')).toBe('icons/payment/payment-methods-footer.svg');

    const alt = img.getAttribute('alt') ?? '';
    expect(alt).toContain('Mastercard');
    expect(alt).toContain('ArCa');
    expect(alt).toContain('Telcell Wallet');
    expect(alt).toContain('VTB');
    expect(alt).toContain('Ապառիկ');
    expect(alt).toContain('МИР');
    expect(alt).not.toContain('Visa');
    expect(alt).not.toContain('Idram');
    expect(alt).not.toContain('American Express');
    expect(alt).not.toContain('MyAmeria');
  });
});

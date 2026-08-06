import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Icon } from '../icon/icon';

interface FooterCategoryLink {
  id: string;
  labelKey: string;
}

interface PaymentBadge {
  id: string;
  label: string;
  logo?: string;
}

@Component({
  selector: 'app-footer',
  imports: [TranslatePipe, Icon],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer {

  readonly shopLinks: FooterCategoryLink[] = [
    { id: 'laptops', labelKey: 'LAPTOPS' },
    { id: 'phones', labelKey: 'PHONES' },
    { id: 'monitors', labelKey: 'MONITORS' },
    { id: 'audio', labelKey: 'AUDIO' },
    { id: 'games', labelKey: 'GAMES' }
  ];

  readonly paymentBadges: PaymentBadge[] = [
    { id: 'visa', label: 'Visa', logo: 'icons/payment/visa.svg' },
    { id: 'mastercard', label: 'Mastercard', logo: 'icons/payment/mastercard.svg' },
    { id: 'arca', label: 'ArCa' },
    { id: 'telcell', label: 'Telcell Wallet' },
    { id: 'idram', label: 'Idram' },
    { id: 'amex', label: 'American Express', logo: 'icons/payment/americanexpress.svg' },
    { id: 'myameria', label: 'MyAmeria' }
  ];

  readonly supportLinkKeys = ['FOOTER_RETURNS', 'FOOTER_WARRANTY', 'FOOTER_CONTACT', 'FOOTER_FAQ'];
  readonly companyLinkKeys = ['FOOTER_ABOUT', 'FOOTER_CAREERS', 'FOOTER_BLOG', 'FOOTER_PRIVACY', 'FOOTER_TERMS'];

  readonly currentYear = new Date().getFullYear();

  constructor(private router: Router) {}

  goToCategory(id: string): void {
    this.router.navigate(['/products'], { queryParams: { category: id } }).then();
  }

  goToOrders(): void {
    this.router.navigate(['/orders']).then();
  }
}

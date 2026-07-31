import { Pipe, PipeTransform } from '@angular/core';
import { LanguageService } from '../services/language';
import { convertFromAmd, currencyForLanguage } from '../config/currency';

const GROUPED_NUMBER = new Intl.NumberFormat('en-US');

@Pipe({
  name: 'price',
  pure: false
})
export class PricePipe implements PipeTransform {
  constructor(private languageService: LanguageService) {}

  transform(priceAmd: number | null | undefined): string {
    if (priceAmd == null) return '';
    const currency = currencyForLanguage(this.languageService.current());
    const converted = convertFromAmd(priceAmd, currency);
    return `${currency.symbol}${GROUPED_NUMBER.format(converted)}`;
  }
}

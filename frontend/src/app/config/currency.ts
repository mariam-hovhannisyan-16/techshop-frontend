import { SupportedLanguage } from '../services/language';

export type CurrencyCode = 'AMD' | 'USD' | 'RUB';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  amdPerUnit: number;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  AMD: { code: 'AMD', symbol: '֏', amdPerUnit: 1 },
  USD: { code: 'USD', symbol: '$', amdPerUnit: 400 },
  RUB: { code: 'RUB', symbol: '₽', amdPerUnit: 4.5 }
};

export const LANGUAGE_CURRENCY: Record<SupportedLanguage, CurrencyCode> = {
  hy: 'AMD',
  en: 'USD',
  ru: 'RUB'
};

export function currencyForLanguage(lang: SupportedLanguage): CurrencyConfig {
  return CURRENCIES[LANGUAGE_CURRENCY[lang]];
}

export function convertFromAmd(amountAmd: number, currency: CurrencyConfig): number {
  return Math.round(amountAmd / currency.amdPerUnit);
}

const GROUPED_NUMBER = new Intl.NumberFormat('en-US');

export function formatAmd(amountAmd: number): string {
  return `${CURRENCIES.AMD.symbol}${GROUPED_NUMBER.format(Math.round(amountAmd))}`;
}

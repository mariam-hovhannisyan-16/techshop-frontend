import { Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

const STORAGE_KEY = 'app_language';
export const SUPPORTED_LANGUAGES = ['hy', 'ru', 'en'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  readonly current = signal<SupportedLanguage>(this.readStoredLanguage());

  constructor(private translate: TranslateService) {
    this.translate.use(this.current());
    this.syncDocumentLang(this.current());
  }

  private readStoredLanguage(): SupportedLanguage {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (SUPPORTED_LANGUAGES as readonly string[]).includes(stored ?? '') ? (stored as SupportedLanguage) : 'hy';
  }

  private syncDocumentLang(lang: SupportedLanguage): void {
    document.documentElement.lang = lang;
  }

  setLanguage(lang: SupportedLanguage): void {
    this.current.set(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    this.translate.use(lang);
    this.syncDocumentLang(lang);
  }
}

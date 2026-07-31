import { Component } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService, SupportedLanguage } from '../../services/language';

interface LanguageOption {
  code: SupportedLanguage;
  shortLabel: string;
  fullLabelKey: string;
}

@Component({
  selector: 'app-language-switcher',
  imports: [TranslatePipe, NgTemplateOutlet],
  templateUrl: './language-switcher.html',
  styleUrl: './language-switcher.scss',
})
export class LanguageSwitcher {
  menuOpen = false;

  readonly options: LanguageOption[] = [
    { code: 'hy', shortLabel: 'Հայ', fullLabelKey: 'ARMENIAN' },
    { code: 'ru', shortLabel: 'Рус', fullLabelKey: 'RUSSIAN' },
    { code: 'en', shortLabel: 'Eng', fullLabelKey: 'ENGLISH' }
  ];

  constructor(private languageService: LanguageService) {}

  get current(): SupportedLanguage {
    return this.languageService.current();
  }

  get currentOption(): LanguageOption {
    return this.options.find(option => option.code === this.current) ?? this.options[0];
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  select(lang: SupportedLanguage): void {
    this.languageService.setLanguage(lang);
    this.menuOpen = false;
  }
}

import { Component, ElementRef, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ProductFiltersPanelService } from '../../services/product-filters-panel';
import { LanguageService } from '../../services/language';
import { currencyForLanguage } from '../../config/currency';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-filters-toggle',
  imports: [Icon, TranslatePipe, FormsModule],
  templateUrl: './filters-toggle.html',
  styleUrl: './filters-toggle.scss',
})
export class FiltersToggle {
  constructor(
    private elementRef: ElementRef<HTMLElement>,
    private filtersPanelService: ProductFiltersPanelService,
    private languageService: LanguageService
  ) {}

  get isOpen(): boolean {
    return this.filtersPanelService.isOpen();
  }

  get currencySymbol(): string {
    return currencyForLanguage(this.languageService.current()).symbol;
  }

  get minPrice(): number | null {
    return this.filtersPanelService.minPrice();
  }

  set minPrice(value: number | null) {
    this.filtersPanelService.setMinPrice(value);
  }

  get maxPrice(): number | null {
    return this.filtersPanelService.maxPrice();
  }

  set maxPrice(value: number | null) {
    this.filtersPanelService.setMaxPrice(value);
  }

  toggle(): void {
    this.filtersPanelService.toggle();
  }

  clearPrice(): void {
    this.filtersPanelService.clear();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isOpen && !this.elementRef.nativeElement.contains(event.target as Node)) {
      this.filtersPanelService.close();
    }
  }
}

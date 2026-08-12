import { Injectable, signal } from '@angular/core';

// Shared so the header's Filters dropdown (rendered outside the products
// page's own component tree, anchored under the header button) can hold the
// price-range bounds that the products page reads to filter its list.
@Injectable({
  providedIn: 'root'
})
export class ProductFiltersPanelService {
  readonly isOpen = signal(false);
  readonly minPrice = signal<number | null>(null);
  readonly maxPrice = signal<number | null>(null);

  toggle(): void {
    this.isOpen.update(open => !open);
  }

  close(): void {
    this.isOpen.set(false);
  }

  setMinPrice(value: number | null): void {
    this.minPrice.set(value);
  }

  setMaxPrice(value: number | null): void {
    this.maxPrice.set(value);
  }

  clear(): void {
    this.minPrice.set(null);
    this.maxPrice.set(null);
  }
}

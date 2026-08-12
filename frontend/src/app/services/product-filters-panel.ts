import { Injectable, signal } from '@angular/core';

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

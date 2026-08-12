import { Injectable, signal } from '@angular/core';

// Shared so the header's Filters toggle button (rendered outside the
// products page's own component tree) can open/close the price-range panel
// that lives on the products page.
@Injectable({
  providedIn: 'root'
})
export class ProductFiltersPanelService {
  readonly isOpen = signal(false);

  toggle(): void {
    this.isOpen.update(open => !open);
  }
}

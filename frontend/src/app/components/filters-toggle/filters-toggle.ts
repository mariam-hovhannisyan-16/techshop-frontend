import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ProductFiltersPanelService } from '../../services/product-filters-panel';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-filters-toggle',
  imports: [Icon, TranslatePipe],
  templateUrl: './filters-toggle.html',
  styleUrl: './filters-toggle.scss',
})
export class FiltersToggle {
  constructor(private router: Router, private filtersPanelService: ProductFiltersPanelService) {}

  // app-header is embedded fresh in each page's own template rather than
  // persisting across navigations, so a plain snapshot of the current URL
  // reflects the right page — no need to subscribe to route changes.
  get isProductsPage(): boolean {
    return this.router.url.split('?')[0] === '/products';
  }

  get isOpen(): boolean {
    return this.filtersPanelService.isOpen();
  }

  toggle(): void {
    this.filtersPanelService.toggle();
  }
}

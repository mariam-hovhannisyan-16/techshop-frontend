import { Component, Input } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { WishlistService } from '../../services/wishlist';
import { Auth } from '../../services/auth';
import { AuthDrawerService } from '../../services/auth-drawer';
import { ToastService } from '../../services/toast';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-wishlist-button',
  imports: [Icon, TranslatePipe],
  templateUrl: './wishlist-button.html',
  styleUrl: './wishlist-button.scss',
  host: { '[class.inline]': 'inline' },
})
export class WishlistButton {
  @Input({ required: true }) productId!: number;
  // Default (false) overlays the button in the corner of a product image, as used on
  // product cards/detail. Set true to lay it out inline instead (e.g. in a cart row's
  // action group), matching the surrounding flex layout instead of floating over it.
  @Input() inline = false;

  constructor(
    private wishlistService: WishlistService,
    private authService: Auth,
    private authDrawerService: AuthDrawerService,
    private toastService: ToastService,
    private translateService: TranslateService
  ) {}

  get isActive(): boolean {
    return this.wishlistService.isInWishlist(this.productId);
  }

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  toggle(event: Event): void {
    event.stopPropagation();

    if (!this.authService.getToken()) {
      this.authDrawerService.open('login');
      return;
    }

    if (this.isActive) {
      this.wishlistService.removeFromWishlist(this.productId).subscribe({
        next: () => this.toastService.show(this.translateService.instant('TOAST_REMOVED_FROM_WISHLIST'), 'success'),
        error: () => this.toastService.show(this.translateService.instant('TOAST_FAILED_UPDATE_WISHLIST'), 'error')
      });
    } else {
      this.wishlistService.addToWishlist(this.productId).subscribe({
        next: () => this.toastService.show(this.translateService.instant('TOAST_ADDED_TO_WISHLIST'), 'success'),
        error: () => this.toastService.show(this.translateService.instant('TOAST_FAILED_UPDATE_WISHLIST'), 'error')
      });
    }
  }
}

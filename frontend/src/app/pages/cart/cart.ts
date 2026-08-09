import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CartService, CartResponse, CartItemResponse } from '../../services/cart';
import { Auth } from '../../services/auth';
import { ToastService } from '../../services/toast';
import { AppHeader } from '../../components/app-header/app-header';
import { Icon } from '../../components/icon/icon';
import { Toast } from '../../components/toast/toast';
import { StarRating } from '../../components/star-rating/star-rating';
import { WishlistButton } from '../../components/wishlist-button/wishlist-button';
import { TrustBadges } from '../../components/trust-badges/trust-badges';
import { PricePipe } from '../../pipes/price';
import { FREE_SHIPPING_THRESHOLD_AMD, DELIVERY_FEE_AMD } from '../../config/delivery';
import { formatAmd } from '../../config/currency';

@Component({
  selector: 'app-cart',
  imports: [CommonModule, AppHeader, Icon, Toast, StarRating, WishlistButton, TrustBadges, PricePipe, TranslatePipe],
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
})
export class Cart implements OnInit {
  cart: CartResponse | null = null;
  errorMessage = '';
  userId: number = 1;

  private failedImages = new Set<number>();
  private updatingProductIds = new Set<number>();

  readonly freeShippingThresholdFormatted = formatAmd(FREE_SHIPPING_THRESHOLD_AMD);
  readonly deliveryFeeAmd = DELIVERY_FEE_AMD;

  get cartTotalWithDelivery(): number {
    return (this.cart?.totalPrice ?? 0) + this.deliveryFeeAmd;
  }

  constructor(
    private cartService: CartService,
    private authService: Auth,
    private toastService: ToastService,
    private translateService: TranslateService,
    public router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.userId = this.authService.getUserId() ?? 1;
  }

  ngOnInit(): void {
    this.loadCart();
  }

  loadCart(): void {
    this.errorMessage = '';
    this.cartService.getCart(this.userId).subscribe({
      next: (response) => {
        this.cart = response.data;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'FAILED_TO_LOAD_CART';
        this.cdr.detectChanges();
      }
    });
  }

  imageSrc(item: CartItemResponse): string | null {
    if (this.failedImages.has(item.productId)) return null;
    return item.productImage ?? null;
  }

  onImageError(productId: number): void {
    this.failedImages.add(productId);
  }

  isInStock(item: CartItemResponse): boolean {
    return item.productStock === undefined || item.productStock > 0;
  }

  isUpdating(productId: number): boolean {
    return this.updatingProductIds.has(productId);
  }

  incrementQuantity(item: CartItemResponse): void {
    this.changeQuantity(item, item.quantity + 1);
  }

  decrementQuantity(item: CartItemResponse): void {
    this.changeQuantity(item, item.quantity - 1);
  }

  onQuantityInputChange(item: CartItemResponse, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = Math.floor(Number(input.value));
    if (!Number.isFinite(value) || value < 1) {
      input.value = String(item.quantity);
      return;
    }
    this.changeQuantity(item, value);
  }

  private changeQuantity(item: CartItemResponse, newQuantity: number): void {
    if (this.isUpdating(item.productId) || newQuantity < 1) return;
    this.updatingProductIds.add(item.productId);
    this.cartService.updateItemQuantity(this.userId, item.productId, item.quantity, newQuantity).subscribe({
      next: (response) => {
        this.cart = response.data;
        this.updatingProductIds.delete(item.productId);
        this.cdr.detectChanges();
      },
      error: () => {
        this.updatingProductIds.delete(item.productId);
        this.toastService.show(this.translateService.instant('TOAST_FAILED_UPDATE_QUANTITY'), 'error');
        this.cdr.detectChanges();
      }
    });
  }

  removeItem(productId: number): void {
    if (this.isUpdating(productId)) return;
    this.updatingProductIds.add(productId);
    this.cartService.removeItem(this.userId, productId).subscribe({
      next: (response) => {
        this.cart = response.data;
        this.updatingProductIds.delete(productId);
        this.cdr.detectChanges();
      },
      error: () => {
        this.updatingProductIds.delete(productId);
        this.toastService.show(this.translateService.instant('TOAST_FAILED_REMOVE_ITEM'), 'error');
        this.cdr.detectChanges();
      }
    });
  }

  goToCheckout(): void {
    this.router.navigate(['/checkout']).then();
  }
}

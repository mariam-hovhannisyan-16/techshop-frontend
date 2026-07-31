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
import { PricePipe } from '../../pipes/price';

@Component({
  selector: 'app-cart',
  imports: [CommonModule, AppHeader, Icon, Toast, PricePipe, TranslatePipe],
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
})
export class Cart implements OnInit {
  cart: CartResponse | null = null;
  errorMessage = '';
  userId: number = 1;

  private failedImages = new Set<number>();

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

  removeItem(productId: number): void {
    this.cartService.removeItem(this.userId, productId).subscribe({
      next: (response) => {
        this.cart = response.data;
        this.cdr.detectChanges();
      },
      error: () => this.toastService.show(this.translateService.instant('TOAST_FAILED_REMOVE_ITEM'), 'error')
    });
  }

  goToCheckout(): void {
    this.router.navigate(['/checkout']).then();
  }
}

import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Product, SurpriseBoxResponse } from '../../services/product';
import { CartService } from '../../services/cart';
import { Auth } from '../../services/auth';
import { AuthDrawerService } from '../../services/auth-drawer';
import { ToastService } from '../../services/toast';
import { Toast } from '../../components/toast/toast';
import { AppHeader } from '../../components/app-header/app-header';
import { EmptyState } from '../../components/empty-state/empty-state';
import { Skeleton } from '../../components/skeleton/skeleton';
import { ProductCard } from '../../components/product-card/product-card';
import { Icon } from '../../components/icon/icon';
import { formatAmd } from '../../config/currency';

@Component({
  selector: 'app-surprise-box',
  imports: [CommonModule, FormsModule, TranslatePipe, Toast, AppHeader, EmptyState, Skeleton, ProductCard, Icon],
  templateUrl: './surprise-box.html',
  styleUrl: './surprise-box.scss',
})
export class SurpriseBox {
  budget: number | null = null;
  loading = false;
  hasError = false;
  result: SurpriseBoxResponse | null = null;
  userId: number;

  constructor(
    private productService: Product,
    private cartService: CartService,
    private authService: Auth,
    private authDrawerService: AuthDrawerService,
    private toastService: ToastService,
    private translateService: TranslateService,
    public router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.userId = this.authService.getUserId() ?? 1;
  }

  generate(): void {
    if (!this.budget || this.budget <= 0) return;
    this.loading = true;
    this.hasError = false;
    this.productService.getSurpriseBox(this.budget).subscribe({
      next: (result) => {
        this.result = result;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.hasError = true;
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  get formattedTotal(): string {
    return this.result ? formatAmd(this.result.totalPrice) : '';
  }

  get formattedBudget(): string {
    return this.budget ? formatAmd(this.budget) : '';
  }

  viewProduct(id: number): void {
    this.router.navigate(['/product', id]).then();
  }

  addToCart(productId: number): void {
    if (!this.authService.getToken()) {
      this.authDrawerService.open('login');
      return;
    }
    this.cartService.addItem(this.userId, productId, 1).subscribe({
      next: () => this.toastService.show(this.translateService.instant('TOAST_ADDED_TO_CART'), 'success'),
      error: () => this.toastService.show(this.translateService.instant('TOAST_FAILED_ADD_TO_CART'), 'error')
    });
  }
}

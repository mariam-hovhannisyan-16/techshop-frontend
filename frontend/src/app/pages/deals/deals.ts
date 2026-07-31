import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Product, ProductResponse } from '../../services/product';
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

@Component({
  selector: 'app-deals',
  imports: [CommonModule, TranslatePipe, Toast, AppHeader, EmptyState, Skeleton, ProductCard, Icon],
  templateUrl: './deals.html',
  styleUrl: './deals.scss',
})
export class Deals implements OnInit {
  deals: ProductResponse[] = [];
  loading = true;
  hasError = false;
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

  ngOnInit(): void {
    this.loadDeals();
  }

  loadDeals(): void {
    this.loading = true;
    this.hasError = false;
    this.productService.getAllProducts().subscribe({
      next: (response) => {
        this.deals = response.data.filter(p => p.originalPrice && p.originalPrice > p.price);
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

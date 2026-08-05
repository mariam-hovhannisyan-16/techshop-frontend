import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { WishlistService, WishlistItemResponse } from '../../services/wishlist';
import { Product, ProductResponse } from '../../services/product';
import { inferCategory } from '../../services/category';
import { CartService } from '../../services/cart';
import { Auth } from '../../services/auth';
import { AuthDrawerService } from '../../services/auth-drawer';
import { ToastService } from '../../services/toast';
import { ChatWidgetService } from '../../services/chat-widget';
import { Toast } from '../../components/toast/toast';
import { ProductCard, ProductCardData } from '../../components/product-card/product-card';
import { AppHeader } from '../../components/app-header/app-header';
import { EmptyState } from '../../components/empty-state/empty-state';
import { Icon } from '../../components/icon/icon';
import { PricePipe } from '../../pipes/price';

const RECOMMENDED_COUNT = 6;
const NOTIFY_PRICE_KEY = 'wishlist_notify_price_changes';

@Component({
  selector: 'app-wishlist',
  imports: [CommonModule, TranslatePipe, Toast, ProductCard, AppHeader, EmptyState, Icon, PricePipe],
  templateUrl: './wishlist.html',
  styleUrl: './wishlist.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Wishlist implements OnInit {
  items: WishlistItemResponse[] = [];

  private catalogById = new Map<number, ProductResponse>();

  recommendedProducts: ProductResponse[] = [];
  notifyPriceChanges = false;
  loading = true;
  errorMessage = '';
  userId: number = 1;

  constructor(
    private wishlistService: WishlistService,
    private productService: Product,
    private cartService: CartService,
    private authService: Auth,
    private authDrawerService: AuthDrawerService,
    private toastService: ToastService,
    private translateService: TranslateService,
    private chatWidgetService: ChatWidgetService,
    public router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.userId = this.authService.getUserId() ?? 1;
    this.notifyPriceChanges = localStorage.getItem(NOTIFY_PRICE_KEY) === 'true';
  }

  ngOnInit(): void {
    this.loadWishlist();
  }

  loadWishlist(): void {
    this.loading = true;
    this.errorMessage = '';
    forkJoin({
      wishlist: this.wishlistService.getWishlist(),
      catalog: this.productService.getAllProducts()
    }).subscribe({
      next: ({ wishlist, catalog }) => {
        this.items = wishlist.data;
        this.catalogById = new Map(catalog.data.map(p => [p.id, p]));
        this.updateRecommendations();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'FAILED_TO_LOAD_WISHLIST';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private updateRecommendations(): void {
    const wishlistIds = new Set(this.items.map(item => item.productId));
    const available = Array.from(this.catalogById.values()).filter(p => !wishlistIds.has(p.id));
    const byRating = [...available].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

    if (this.items.length === 0) {
      this.recommendedProducts = byRating.slice(0, RECOMMENDED_COUNT);
      return;
    }

    const wishlistedProducts = this.items
      .map(item => this.catalogById.get(item.productId))
      .filter((p): p is ProductResponse => !!p);
    const wishlistedCategories = new Set(
      wishlistedProducts.map(p => inferCategory(p)).filter((c): c is string => !!c)
    );
    const wishlistedBrands = new Set(
      wishlistedProducts.map(p => p.brand).filter((b): b is string => !!b)
    );

    const matches = byRating.filter(p => {
      const category = inferCategory(p);
      return (category !== null && wishlistedCategories.has(category)) || (!!p.brand && wishlistedBrands.has(p.brand));
    });
    const filler = byRating.filter(p => !matches.includes(p));

    this.recommendedProducts = [...matches, ...filler].slice(0, RECOMMENDED_COUNT);
  }

  toCardData(item: WishlistItemResponse): ProductCardData {
    const catalogEntry = this.catalogById.get(item.productId);
    return {
      id: item.productId,
      name: item.productName,
      price: item.productPrice,
      quantity: item.quantity,
      description: catalogEntry?.description,
      originalPrice: catalogEntry?.originalPrice,
      imageUrl: catalogEntry?.imageUrl,
      rating: catalogEntry?.rating,
      reviewCount: catalogEntry?.reviewCount,
      badge: catalogEntry?.badge,
      spec: catalogEntry?.spec
    };
  }

  removeItem(productId: number): void {
    this.wishlistService.removeFromWishlist(productId).subscribe({
      next: () => {
        this.items = this.items.filter(item => item.productId !== productId);
        this.updateRecommendations();
        this.toastService.show(this.translateService.instant('TOAST_REMOVED_FROM_WISHLIST'), 'success');
        this.cdr.detectChanges();
      },
      error: () => this.toastService.show(this.translateService.instant('TOAST_FAILED_REMOVE_ITEM'), 'error')
    });
  }

  addToCart(productId: number): void {
    this.cartService.addItem(this.userId, productId, 1).subscribe({
      next: () => this.toastService.show(this.translateService.instant('TOAST_ADDED_TO_CART'), 'success'),
      error: () => this.toastService.show(this.translateService.instant('TOAST_FAILED_ADD_TO_CART'), 'error')
    });
  }

  clearWishlist(): void {
    if (this.items.length === 0) return;
    if (!confirm(this.translateService.instant('CONFIRM_CLEAR_WISHLIST'))) return;

    const productIds = this.items.map(item => item.productId);
    forkJoin(productIds.map(id => this.wishlistService.removeFromWishlist(id))).subscribe({
      next: () => {
        this.items = [];
        this.updateRecommendations();
        this.toastService.show(this.translateService.instant('TOAST_ALL_REMOVED'), 'success');
        this.cdr.detectChanges();
      },
      error: () => this.toastService.show(this.translateService.instant('TOAST_FAILED_REMOVE_ITEM'), 'error')
    });
  }

  viewProduct(productId: number): void {
    this.router.navigate(['/products'], { queryParams: { highlight: productId } }).then();
  }

  viewAllRecommended(): void {
    this.router.navigate(['/products']).then();
  }

  miniImageSrc(product: ProductResponse): string | null {
    return product.imageUrl ?? null;
  }

  quickAddToCart(productId: number): void {
    if (!this.authService.getToken()) {
      this.authDrawerService.open('login');
      return;
    }
    this.cartService.addItem(this.userId, productId, 1).subscribe({
      next: () => this.toastService.show(this.translateService.instant('TOAST_ADDED_TO_CART'), 'success'),
      error: () => this.toastService.show(this.translateService.instant('TOAST_FAILED_ADD_TO_CART'), 'error')
    });
  }

  toggleNotifyPriceChanges(): void {
    this.notifyPriceChanges = !this.notifyPriceChanges;
    localStorage.setItem(NOTIFY_PRICE_KEY, String(this.notifyPriceChanges));
    this.toastService.show(
      this.translateService.instant(this.notifyPriceChanges ? 'TOAST_PRICE_NOTIFY_ON' : 'TOAST_PRICE_NOTIFY_OFF'),
      'success'
    );
  }

  openChat(): void {
    this.chatWidgetService.requestOpen();
  }
}

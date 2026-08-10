import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Product, ProductResponse, StorageOption, ColorVariant } from '../../services/product';
import { CartService } from '../../services/cart';
import { Auth } from '../../services/auth';
import { AuthDrawerService } from '../../services/auth-drawer';
import { ToastService } from '../../services/toast';
import { ReviewsService, Review } from '../../services/reviews';
import { OrderService } from '../../services/order';
import { RecentlyViewedService, RecentlyViewedEntry } from '../../services/recently-viewed';
import { inferCategory, matchesCategory } from '../../services/category';
import { Toast } from '../../components/toast/toast';
import { WishlistButton } from '../../components/wishlist-button/wishlist-button';
import { AppHeader } from '../../components/app-header/app-header';
import { Skeleton } from '../../components/skeleton/skeleton';
import { StarRating } from '../../components/star-rating/star-rating';
import { ProductCard } from '../../components/product-card/product-card';
import { Icon } from '../../components/icon/icon';
import { InstallmentModal, DEFAULT_INSTALLMENT_DURATION_MONTHS } from '../../components/installment-modal/installment-modal';
import { PricePipe } from '../../pipes/price';

// Matches the backend's ReviewServiceImpl.VERIFIED_PURCHASE_STATUSES exactly — REFUNDED is
// deliberately excluded there, so it must be excluded here too.
const VERIFIED_PURCHASE_STATUSES = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

@Component({
  selector: 'app-product-detail',
  imports: [CommonModule, FormsModule, TranslatePipe, Toast, WishlistButton, AppHeader, Skeleton, StarRating, ProductCard, Icon, InstallmentModal, PricePipe],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.scss',
})
export class ProductDetail implements OnInit {
  product: ProductResponse | undefined;
  loading = true;
  errorMessage = '';
  notFound = false;
  productId = 0;
  userId: number = 1;
  quantity = 1;
  activeImageIndex = 0;
  selectedStorageOption: StorageOption | null = null;
  selectedSimOption: string | null = null;
  selectedColorVariant: ColorVariant | null = null;

  relatedProducts: ProductResponse[] = [];
  reviews: Review[] = [];
  averageRating = 0;
  reviewsLoading = true;

  hasPurchased = false;
  alreadyReviewed = false;
  newReviewRating = 0;
  newReviewComment = '';
  submittingReview = false;
  reviewSubmitError = '';

  constructor(
    private productService: Product,
    private cartService: CartService,
    private authService: Auth,
    private authDrawerService: AuthDrawerService,
    private toastService: ToastService,
    private translateService: TranslateService,
    private reviewsService: ReviewsService,
    private orderService: OrderService,
    private recentlyViewedService: RecentlyViewedService,
    private route: ActivatedRoute,
    public router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.userId = this.authService.getUserId() ?? 1;
  }

  ngOnInit(): void {
    this.productId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadProduct();
  }

  loadProduct(): void {
    this.loading = true;
    this.errorMessage = '';
    this.notFound = false;
    this.activeImageIndex = 0;
    this.quantity = 1;
    this.selectedStorageOption = null;
    this.selectedSimOption = null;
    this.selectedColorVariant = null;
    this.hasPurchased = false;
    this.alreadyReviewed = false;
    this.newReviewRating = 0;
    this.newReviewComment = '';
    this.reviewSubmitError = '';

    this.productService.getProductById(this.productId).subscribe({
      next: (response) => {
        this.product = response.data;
        this.selectedStorageOption = this.product.storageOptions?.find(o => o.priceDelta === 0)
          ?? this.product.storageOptions?.[0]
          ?? null;
        this.selectedSimOption = this.product.simOptions?.[0] ?? null;
        this.selectedColorVariant = this.product.colorVariants?.[0] ?? null;
        this.loading = false;
        this.cdr.detectChanges();

        this.recentlyViewedService.record({ id: this.product.id, name: this.product.name, price: this.product.price, imageUrl: this.product.imageUrl });
        this.loadRelatedProducts();
        this.loadReviews();
        this.checkPurchaseEligibility();
      },
      error: (err) => {
        if (err.status === 404) {
          this.notFound = true;
        } else {
          this.errorMessage = 'FAILED_TO_LOAD_PRODUCT';
        }
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private loadRelatedProducts(): void {
    if (!this.product) return;
    const category = inferCategory(this.product);
    if (!category) return;

    this.productService.getAllProducts().subscribe({
      next: (response) => {
        this.relatedProducts = response.data
          .filter(p => p.id !== this.product!.id && matchesCategory(p, category))
          .slice(0, 4);
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  private loadReviews(): void {
    if (!this.product) return;
    this.reviewsLoading = true;
    const productId = this.product.id;

    this.reviewsService.getReviews(productId).subscribe({
      next: (reviews) => {
        this.reviews = reviews;
        this.reviewsLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.reviewsLoading = false;
        this.cdr.detectChanges();
      }
    });

    this.reviewsService.getAverageRating(productId).subscribe({
      next: (avg) => {
        this.averageRating = avg;
        this.cdr.detectChanges();
      },
      error: () => this.cdr.detectChanges()
    });
  }

  private checkPurchaseEligibility(): void {
    if (!this.product || !this.authService.getToken()) {
      this.cdr.detectChanges();
      return;
    }
    const productId = this.product.id;

    this.orderService.getUserOrders(this.userId).subscribe({
      next: (response) => {
        this.hasPurchased = response.data.some(order =>
          VERIFIED_PURCHASE_STATUSES.includes(order.status)
          && order.items.some(item => item.productId === productId)
        );
        this.cdr.detectChanges();
      },
      error: () => this.cdr.detectChanges()
    });
  }

  get canShowReviewForm(): boolean {
    return !!this.authService.getToken() && this.hasPurchased && !this.alreadyReviewed;
  }

  setReviewRating(rating: number): void {
    this.newReviewRating = rating;
  }

  get isReviewFormValid(): boolean {
    return this.newReviewRating >= 1 && this.newReviewRating <= 5 && this.newReviewComment.trim().length > 0;
  }

  submitReview(): void {
    if (!this.product || this.submittingReview || !this.isReviewFormValid) return;

    this.submittingReview = true;
    this.reviewSubmitError = '';

    this.reviewsService.createReview({
      productId: this.product.id,
      rating: this.newReviewRating,
      comment: this.newReviewComment.trim()
    }).subscribe({
      next: (response) => {
        this.reviews = [response.data, ...this.reviews];
        this.averageRating = this.reviews.reduce((sum, r) => sum + r.rating, 0) / this.reviews.length;
        this.newReviewRating = 0;
        this.newReviewComment = '';
        this.submittingReview = false;
        this.toastService.show(this.translateService.instant('TOAST_REVIEW_SUBMITTED'), 'success');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.submittingReview = false;
        if (err.status === 403) {
          this.hasPurchased = false;
          this.reviewSubmitError = this.translateService.instant('REVIEW_NOT_PURCHASED');
        } else if (err.status === 409) {
          this.alreadyReviewed = true;
          this.reviewSubmitError = this.translateService.instant('REVIEW_ALREADY_SUBMITTED');
        } else {
          this.reviewSubmitError = this.translateService.instant('REVIEW_SUBMIT_FAILED');
        }
        this.cdr.detectChanges();
      }
    });
  }

  get inferredCategory(): string | null {
    return this.product ? inferCategory(this.product) : null;
  }

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  get recentlyViewedOthers(): RecentlyViewedEntry[] {
    return this.product ? this.recentlyViewedService.getOthersThan(this.product.id) : [];
  }

  private failedImages = new Set<string>();

  get galleryImages(): string[] {
    return this.product?.imageUrl ? [this.product.imageUrl] : [];
  }

  get mainImageSrc(): string | null {
    const src = this.selectedColorVariant?.imageUrl ?? this.galleryImages[this.activeImageIndex];
    return src && !this.failedImages.has(src) ? src : null;
  }

  get hasColorSelector(): boolean {
    return (this.product?.colorVariants?.length ?? 0) > 1;
  }

  isImageFailed(src: string): boolean {
    return this.failedImages.has(src);
  }

  onImageError(src: string): void {
    this.failedImages.add(src);
  }

  selectImage(index: number): void {
    this.activeImageIndex = index;
  }

  readonly installmentMonths = DEFAULT_INSTALLMENT_DURATION_MONTHS;

  get displayPrice(): number {
    if (!this.product) return 0;
    return this.product.price + (this.selectedStorageOption?.priceDelta ?? 0);
  }

  selectStorage(option: StorageOption): void {
    this.selectedStorageOption = option;
  }

  selectSim(option: string): void {
    this.selectedSimOption = option;
  }

  selectColor(variant: ColorVariant): void {
    this.selectedColorVariant = variant;
  }

  get installmentMonthlyPayment(): number {
    return Math.round(this.displayPrice / this.installmentMonths);
  }

  get hasDiscount(): boolean {
    return !!(this.product?.originalPrice && this.product.originalPrice > this.product.price);
  }

  get discountPercent(): number {
    if (!this.hasDiscount || !this.product?.originalPrice) return 0;
    return Math.round((1 - this.product.price / this.product.originalPrice) * 100);
  }

  incrementQuantity(): void {
    this.quantity++;
  }

  decrementQuantity(): void {
    this.quantity = Math.max(1, this.quantity - 1);
  }

  goToProduct(productId: number): void {
    this.router.navigate(['/product', productId]).then();
  }

  addToCart(): void {
    if (!this.product) return;
    if (!this.authService.getToken()) {
      this.authDrawerService.open('login');
      return;
    }
    this.cartService.addItem(this.userId, this.product.id, this.quantity).subscribe({
      next: () => {
        this.toastService.show(this.translateService.instant('TOAST_ADDED_TO_CART'), 'success');
        this.quantity = 1;
      },
      error: () => this.toastService.show(this.translateService.instant('TOAST_FAILED_ADD_TO_CART'), 'error')
    });
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
}

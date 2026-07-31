import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { inferCategory } from '../../services/category';
import { PricePipe } from '../../pipes/price';
import { WishlistButton } from '../wishlist-button/wishlist-button';
import { StarRating } from '../star-rating/star-rating';
import { Icon } from '../icon/icon';
import { InstallmentModal } from '../installment-modal/installment-modal';
import { Auth } from '../../services/auth';

export interface ProductCardData {
  id: number;
  name: string;
  price: number;
  description?: string;
  originalPrice?: number;
  quantity?: number;
  images?: string[];
  rating?: number;
  reviewCount?: number;
  badge?: 'bestseller' | 'new' | 'top-rated' | 'hot-deal';
  spec?: string;
  warrantyYears?: number;
}

const DEFAULT_WARRANTY_YEARS = 2;

const BADGE_LABEL_KEYS: Record<string, string> = {
  bestseller: 'BADGE_BESTSELLER',
  new: 'NEW',
  'top-rated': 'BADGE_TOP_RATED',
  'hot-deal': 'BADGE_HOT_DEAL'
};

@Component({
  selector: 'app-product-card',
  imports: [TranslatePipe, PricePipe, WishlistButton, StarRating, Icon, InstallmentModal],
  templateUrl: './product-card.html',
  styleUrl: './product-card.scss',
})
export class ProductCard {
  @Input({ required: true }) product!: ProductCardData;
  @Input() highlighted = false;
  @Input() size: 'default' | 'large' = 'default';

  @Input() showWishlistButton = true;
  @Input() showAddToCart = true;
  @Input() addToCartLabelKey = 'HERO_ADD_TO_CART';
  @Input() addToCartDisabled = false;
  @Input() showRemoveButton = false;
  @Input() showViewButton = false;

  @Output() view = new EventEmitter<number>();
  @Output() addToCart = new EventEmitter<number>();
  @Output() remove = new EventEmitter<number>();

  private failedImage = false;

  constructor(private authService: Auth) {}

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  get imageSrc(): string | null {
    if (this.failedImage) return null;
    return this.product.images?.[0] ?? null;
  }

  onImageError(): void {
    this.failedImage = true;
  }

  get categoryId(): string | null {
    return inferCategory({ name: this.product.name, description: this.product.description ?? '' });
  }

  badgeLabelKey(badge: string): string {
    return BADGE_LABEL_KEYS[badge] ?? '';
  }

  get hasDiscount(): boolean {
    return !!(this.product.originalPrice && this.product.originalPrice > this.product.price);
  }

  get discountPercent(): number {
    if (!this.hasDiscount || !this.product.originalPrice) return 0;
    return Math.round((1 - this.product.price / this.product.originalPrice) * 100);
  }

  get warrantyYears(): number {
    return this.product.warrantyYears ?? DEFAULT_WARRANTY_YEARS;
  }

  onView(): void {
    this.view.emit(this.product.id);
  }

  onAddToCart(event: Event): void {
    event.stopPropagation();
    this.addToCart.emit(this.product.id);
  }

  onRemove(event: Event): void {
    event.stopPropagation();
    this.remove.emit(this.product.id);
  }

  onViewButtonClick(event: Event): void {
    event.stopPropagation();
    this.view.emit(this.product.id);
  }
}

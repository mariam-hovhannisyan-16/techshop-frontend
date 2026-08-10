import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Product } from '../../services/product';
import { CartService } from '../../services/cart';
import { Auth } from '../../services/auth';
import { AuthDrawerService } from '../../services/auth-drawer';
import { ToastService } from '../../services/toast';
import { matchesCategory, CategoryNavItem, CATEGORY_NAV_ITEMS } from '../../services/category';
import { LanguageService } from '../../services/language';
import { currencyForLanguage } from '../../config/currency';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Toast } from '../../components/toast/toast';
import { AppHeader } from '../../components/app-header/app-header';
import { EmptyState } from '../../components/empty-state/empty-state';
import { Skeleton } from '../../components/skeleton/skeleton';
import { TrustBadges } from '../../components/trust-badges/trust-badges';
import { PromoBanner } from '../../components/promo-banner/promo-banner';
import { ProductCard } from '../../components/product-card/product-card';
import { Icon } from '../../components/icon/icon';

@Component({
  selector: 'app-products',
  imports: [CommonModule, FormsModule, TranslatePipe, Toast, AppHeader, EmptyState, Skeleton, TrustBadges, PromoBanner, ProductCard, Icon],
  templateUrl: './products.html',
  styleUrl: './products.scss',
})
export class Products implements OnInit {
  products: any[] = [];
  filteredProducts: any[] = [];
  loading = true;
  hasError = false;
  searchQuery = '';
  selectedCategory = 'all';
  minPrice: number | null = null;
  maxPrice: number | null = null;
  userId: number = 1;
  highlightedProductId: number | null = null;

  readonly categoryPills: CategoryNavItem[] = CATEGORY_NAV_ITEMS;

  currentPage = 1;
  readonly pageSize = 8;

  constructor(
    private productService: Product,
    private cartService: CartService,
    private authService: Auth,
    private authDrawerService: AuthDrawerService,
    private toastService: ToastService,
    private translateService: TranslateService,
    public router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private languageService: LanguageService
  ) {
    this.userId = this.authService.getUserId() ?? 1;
  }

  ngOnInit(): void {
    const categoryParam = this.route.snapshot.queryParamMap.get('category');
    if (categoryParam) {
      this.selectedCategory = categoryParam;
    }
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading = true;
    this.hasError = false;

    this.productService.getAllProducts().subscribe({
      next: (response) => {
        this.products = response.data;
        this.loading = false;
        this.applyFilters();
        this.highlightFromQueryParam();
      },
      error: () => {
        this.hasError = true;
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  retryLoad(): void {
    this.loadProducts();
  }

  private highlightFromQueryParam(): void {
    const idParam = this.route.snapshot.queryParamMap.get('highlight');
    if (!idParam) return;

    const productId = Number(idParam);
    this.highlightedProductId = productId;

    setTimeout(() => {
      document.getElementById('product-' + productId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    setTimeout(() => {
      this.highlightedProductId = null;
      this.cdr.detectChanges();
    }, 2500);
  }

  viewAllProducts(): void {
    this.selectCategory('all');
    document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  onPromoCtaClick(action: 'shop' | 'deals'): void {
    if (action === 'deals') {
      this.router.navigate(['/deals']).then();
    } else {
      this.viewAllProducts();
    }
  }

  get currentViewTitleKey(): string {
    const pill = this.categoryPills.find(p => p.id === this.selectedCategory);
    return pill?.labelKey ?? 'ALL_PRODUCTS';
  }

  selectCategory(cat: string): void {
    this.selectedCategory = cat;
    this.applyFilters();
  }

  onSearch(value: string): void {
    this.searchQuery = value;
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedCategory = 'all';
    this.minPrice = null;
    this.maxPrice = null;
    this.applyFilters();
  }

  get currencySymbol(): string {
    return currencyForLanguage(this.languageService.current()).symbol;
  }

  clearPriceRange(): void {
    this.minPrice = null;
    this.maxPrice = null;
    this.applyFilters();
  }

  private matchesPriceRange(p: { price: number }): boolean {
    const amdPerUnit = currencyForLanguage(this.languageService.current()).amdPerUnit;
    if (this.minPrice != null && p.price < this.minPrice * amdPerUnit) return false;
    if (this.maxPrice != null && p.price > this.maxPrice * amdPerUnit) return false;
    return true;
  }

  applyFilters(): void {
    const query = this.searchQuery.toLowerCase();
    this.filteredProducts = this.products.filter(p =>
      matchesCategory(p, this.selectedCategory) &&
      (p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query)) &&
      this.matchesPriceRange(p)
    );

    this.currentPage = 1;
    this.cdr.detectChanges();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredProducts.length / this.pageSize));
  }

  get pagedProducts(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredProducts.slice(start, start + this.pageSize);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.cdr.detectChanges();
  }

  viewProduct(productId: number): void {
    this.router.navigate(['/product', productId]).then();
  }

  addToCart(productId: number): void {
    const token = this.authService.getToken();
    if (!token) {
      this.authDrawerService.open('login');
      return;
    }
    this.cartService.addItem(this.userId, productId, 1).subscribe({
      next: () => this.toastService.show(this.translateService.instant('TOAST_ADDED_TO_CART'), 'success'),
      error: () => this.toastService.show(this.translateService.instant('TOAST_FAILED_ADD_TO_CART'), 'error')
    });
  }
}

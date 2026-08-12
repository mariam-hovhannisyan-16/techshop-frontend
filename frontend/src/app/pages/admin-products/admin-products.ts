import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { map, of, switchMap } from 'rxjs';
import { Product, ProductResponse } from '../../services/product';
import { inferCategory } from '../../services/category';
import { ToastService } from '../../services/toast';
import { AppHeader } from '../../components/app-header/app-header';
import { Icon } from '../../components/icon/icon';
import { Toast } from '../../components/toast/toast';
import { StatTile } from '../../components/stat-tile/stat-tile';
import { PricePipe } from '../../pipes/price';

const CATEGORY_LABEL_KEYS: Record<string, string> = {
  laptops: 'LAPTOPS',
  phones: 'PHONES',
  monitors: 'MONITORS',
  tv: 'TV',
  audio: 'AUDIO',
  games: 'GAMES',
  tablets: 'TABLETS',
  camera: 'CAMERA',
  amplifiers: 'AMPLIFIERS',
  accessories: 'ACCESSORIES'
};

interface EditState {
  price: number;
  discountPercent: number | null;
  quantity: number;
}

const DEFAULT_RESTOCK_QUANTITY = 10;

interface AddProductForm {
  name: string;
  category: string;
  price: number | null;
  spec: string;
  imageUrl: string;
}

const EMPTY_ADD_FORM: AddProductForm = { name: '', category: '', price: null, spec: '', imageUrl: '' };

@Component({
  selector: 'app-admin-products',
  imports: [CommonModule, FormsModule, TranslatePipe, AppHeader, Icon, Toast, StatTile, PricePipe],
  templateUrl: './admin-products.html',
  styleUrl: './admin-products.scss',
})
export class AdminProducts implements OnInit {
  products: ProductResponse[] = [];
  loading = true;
  errorMessage = '';

  editingId: number | null = null;
  editState: EditState = { price: 0, discountPercent: null, quantity: 0 };
  private editOriginalQuantity = 0;
  saving = false;

  private failedThumbnailIds = new Set<number>();

  categoryOptions = Object.entries(CATEGORY_LABEL_KEYS).map(([id, labelKey]) => ({ id, labelKey }));
  showAddForm = false;
  addForm: AddProductForm = { ...EMPTY_ADD_FORM };
  adding = false;
  deletingId: number | null = null;

  constructor(
    private productService: Product,
    private toastService: ToastService,
    private translateService: TranslateService,
    public router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading = true;
    this.errorMessage = '';
    this.productService.getAllProducts().subscribe({
      next: (response) => {
        this.products = response.data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'FAILED_TO_LOAD_PRODUCTS';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  categoryLabelKey(product: ProductResponse): string | null {

    if (product.category && CATEGORY_LABEL_KEYS[product.category]) {
      return CATEGORY_LABEL_KEYS[product.category];
    }
    const category = inferCategory({ name: product.name, description: product.description, category: product.category });
    return category ? (CATEGORY_LABEL_KEYS[category] ?? null) : null;
  }

  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    if (!this.showAddForm) {
      this.addForm = { ...EMPTY_ADD_FORM };
    }
  }

  submitAddProduct(): void {
    if (this.adding) return;
    const { name, category, price, spec, imageUrl } = this.addForm;
    if (!name.trim() || !category || !price || price <= 0 || !imageUrl.trim()) return;

    this.adding = true;
    this.productService.createProduct({ name: name.trim(), category, price, spec: spec.trim(), imageUrl: imageUrl.trim() }).subscribe({
      next: () => {
        this.adding = false;
        this.showAddForm = false;
        this.addForm = { ...EMPTY_ADD_FORM };
        this.toastService.show(this.translateService.instant('ADMIN_ADD_PRODUCT_SUCCESS'), 'success');
        this.loadProducts();
      },
      error: () => {
        this.adding = false;
        this.toastService.show(this.translateService.instant('ADMIN_ADD_PRODUCT_FAILED'), 'error');
        this.cdr.detectChanges();
      }
    });
  }

  deleteProduct(product: ProductResponse): void {
    if (this.deletingId) return;
    const confirmed = window.confirm(this.translateService.instant('ADMIN_CONFIRM_DELETE_PRODUCT', { name: product.name }));
    if (!confirmed) return;

    this.deletingId = product.id;
    this.productService.deleteProduct(product.id).subscribe({
      next: () => {
        this.deletingId = null;
        this.products = this.products.filter(p => p.id !== product.id);
        this.toastService.show(this.translateService.instant('ADMIN_DELETE_SUCCESS'), 'success');
        this.cdr.detectChanges();
      },
      error: () => {
        this.deletingId = null;
        this.toastService.show(this.translateService.instant('ADMIN_DELETE_FAILED'), 'error');
        this.cdr.detectChanges();
      }
    });
  }

  discountPercentOf(product: ProductResponse): number | null {
    if (!product.originalPrice || product.originalPrice <= product.price) return null;
    return Math.round((1 - product.price / product.originalPrice) * 100);
  }

  get totalProductsCount(): number {
    return this.products.length;
  }

  get totalInventoryValue(): number {
    return this.products.reduce((sum, p) => sum + p.price * p.quantity, 0);
  }

  get outOfStockCount(): number {
    return this.products.filter(p => p.quantity === 0).length;
  }

  get discountedCount(): number {
    return this.products.filter(p => this.discountPercentOf(p) !== null).length;
  }

  thumbnailSrc(product: ProductResponse): string | null {
    if (!product.imageUrl || this.failedThumbnailIds.has(product.id)) return null;
    return product.imageUrl;
  }

  onThumbnailError(productId: number): void {
    this.failedThumbnailIds.add(productId);
    this.cdr.detectChanges();
  }

  startEdit(product: ProductResponse): void {
    this.editingId = product.id;
    this.editState = {
      price: product.price,
      discountPercent: this.discountPercentOf(product),
      quantity: product.quantity
    };
    this.editOriginalQuantity = product.quantity;
  }

  cancelEdit(): void {
    this.editingId = null;
  }

  selectInputText(event: Event): void {
    (event.target as HTMLInputElement).select();
  }

  toggleStock(): void {
    this.editState.quantity = this.editState.quantity > 0 ? 0 : DEFAULT_RESTOCK_QUANTITY;
  }

  saveEdit(product: ProductResponse): void {
    if (this.saving) return;
    const { price, discountPercent, quantity } = this.editState;

    if (discountPercent != null && (discountPercent < 0 || discountPercent > 100)) {
      this.toastService.show(this.translateService.instant('ADMIN_DISCOUNT_OUT_OF_RANGE'), 'error');
      return;
    }
    if (quantity < 0) {
      this.toastService.show(this.translateService.instant('ADMIN_STOCK_OUT_OF_RANGE'), 'error');
      return;
    }

    this.saving = true;

    const stockChanged = quantity !== this.editOriginalQuantity;

    this.productService.updateProductPrice(product.id, price).pipe(
      switchMap(priceResponse => this.productService.updateProductDiscount(product.id, discountPercent).pipe(
        switchMap(discountResponse => {
          const stock$ = stockChanged
            ? this.productService.updateProductStock(product.id, quantity)
            : of({ success: true, message: 'unchanged', data: product });
          return stock$.pipe(map(stockResponse => [priceResponse, discountResponse, stockResponse] as const));
        })
      ))
    ).subscribe({
      next: ([priceResponse, discountResponse, stockResponse]) => {
        this.saving = false;
        this.editingId = null;

        if (!priceResponse.success || !discountResponse.success || !stockResponse.success) {
          this.toastService.show(this.translateService.instant('ADMIN_SAVE_FAILED'), 'error');
          this.cdr.detectChanges();
          return;
        }

        this.productService.getAllProducts().subscribe({
          next: (response) => {
            this.products = response.data;
            const saved = this.products.find(p => p.id === product.id);
            const expectedDiscount = discountPercent || null;
            const persisted = !!saved
              && saved.price === price
              && this.discountPercentOf(saved) === expectedDiscount
              && saved.quantity === quantity;

            this.toastService.show(
              this.translateService.instant(persisted ? 'ADMIN_SAVE_SUCCESS' : 'ADMIN_SAVE_FAILED'),
              persisted ? 'success' : 'error'
            );
            this.cdr.detectChanges();
          },
          error: () => {
            this.toastService.show(this.translateService.instant('ADMIN_SAVE_SUCCESS'), 'success');
            this.cdr.detectChanges();
          }
        });
      },
      error: () => {
        this.saving = false;
        this.toastService.show(this.translateService.instant('ADMIN_SAVE_FAILED'), 'error');
        this.cdr.detectChanges();
      }
    });
  }
}

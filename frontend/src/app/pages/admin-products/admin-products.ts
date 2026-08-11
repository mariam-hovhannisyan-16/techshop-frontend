import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { map, switchMap } from 'rxjs';
import { Product, ProductResponse } from '../../services/product';
import { inferCategory } from '../../services/category';
import { ToastService } from '../../services/toast';
import { AppHeader } from '../../components/app-header/app-header';
import { Icon } from '../../components/icon/icon';
import { Toast } from '../../components/toast/toast';
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
}

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
  imports: [CommonModule, FormsModule, TranslatePipe, AppHeader, Icon, Toast, PricePipe],
  templateUrl: './admin-products.html',
  styleUrl: './admin-products.scss',
})
export class AdminProducts implements OnInit {
  products: ProductResponse[] = [];
  loading = true;
  errorMessage = '';

  editingId: number | null = null;
  editState: EditState = { price: 0, discountPercent: null };
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
      discountPercent: this.discountPercentOf(product)
    };
  }

  cancelEdit(): void {
    this.editingId = null;
  }

  // The price/discount inputs are pre-filled with the product's current
  // value when edit mode opens. Selecting the text on focus means the first
  // keystroke replaces it — without this, clicking in and typing appends to
  // the existing value instead (e.g. a pre-filled "15" plus a typed "20"
  // becomes "1520"), which the backend correctly rejects as out of range.
  selectInputText(event: Event): void {
    (event.target as HTMLInputElement).select();
  }

  saveEdit(product: ProductResponse): void {
    if (this.saving) return;
    const { price, discountPercent } = this.editState;

    // Defense in depth: catch an out-of-range discount client-side with a
    // clear message instead of sending it to the backend and surfacing a
    // raw 400 as a generic "failed to update" toast.
    if (discountPercent != null && (discountPercent < 0 || discountPercent > 100)) {
      this.toastService.show(this.translateService.instant('ADMIN_DISCOUNT_OUT_OF_RANGE'), 'error');
      return;
    }

    this.saving = true;

    // Price and discount live on the same backend row, and each endpoint does
    // its own read-modify-write with no locking — firing both requests in
    // parallel (as forkJoin previously did) is a real lost-update race:
    // whichever save() commits second overwrites the other field back to its
    // pre-edit value. Chaining them sequentially, so the discount write only
    // starts once the price write has fully committed, avoids that entirely.
    this.productService.updateProductPrice(product.id, price).pipe(
      switchMap(priceResponse => this.productService.updateProductDiscount(product.id, discountPercent).pipe(
        map(discountResponse => [priceResponse, discountResponse] as const)
      ))
    ).subscribe({
      next: ([priceResponse, discountResponse]) => {
        this.saving = false;
        this.editingId = null;

        // Both calls resolving isn't enough on its own to call this a
        // success — the API wraps every response in { success, ... }, so
        // confirm that flag too rather than trusting a 200 status alone.
        if (!priceResponse.success || !discountResponse.success) {
          this.toastService.show(this.translateService.instant('ADMIN_SAVE_FAILED'), 'error');
          this.cdr.detectChanges();
          return;
        }

        // Re-fetch from the backend rather than trusting the edit form's
        // local state, so the success message reflects what's actually
        // persisted, not what we optimistically assume was saved.
        this.productService.getAllProducts().subscribe({
          next: (response) => {
            this.products = response.data;
            const saved = this.products.find(p => p.id === product.id);
            // A discount of 0 and no discount at all are equivalent — the
            // backend only stores originalPrice-driving state for a
            // positive percentage — so normalize both to null before comparing.
            const expectedDiscount = discountPercent || null;
            const persisted = !!saved
              && saved.price === price
              && this.discountPercentOf(saved) === expectedDiscount;

            this.toastService.show(
              this.translateService.instant(persisted ? 'ADMIN_SAVE_SUCCESS' : 'ADMIN_SAVE_FAILED'),
              persisted ? 'success' : 'error'
            );
            this.cdr.detectChanges();
          },
          error: () => {
            // The edit itself already succeeded server-side; a failed refetch
            // just means we can't confirm it from here, not that it failed.
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

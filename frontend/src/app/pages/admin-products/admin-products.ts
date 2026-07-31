import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
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
    const category = inferCategory({ name: product.name, description: product.description });
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

  saveEdit(product: ProductResponse): void {
    if (this.saving) return;
    this.saving = true;
    const { price, discountPercent } = this.editState;

    forkJoin([
      this.productService.updateProductPrice(product.id, price),
      this.productService.updateProductDiscount(product.id, discountPercent)
    ]).subscribe({
      next: () => {
        this.saving = false;
        this.editingId = null;
        this.toastService.show(this.translateService.instant('ADMIN_SAVE_SUCCESS'), 'success');
        this.loadProducts();
      },
      error: () => {
        this.saving = false;
        this.toastService.show(this.translateService.instant('ADMIN_SAVE_FAILED'), 'error');
        this.cdr.detectChanges();
      }
    });
  }
}

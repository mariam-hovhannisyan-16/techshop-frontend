import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { OrderService, DigitalTwinDetail } from '../../services/order';
import { Product } from '../../services/product';
import { ToastService } from '../../services/toast';
import { Toast } from '../../components/toast/toast';
import { AppHeader } from '../../components/app-header/app-header';
import { EmptyState } from '../../components/empty-state/empty-state';
import { Skeleton } from '../../components/skeleton/skeleton';
import { Icon } from '../../components/icon/icon';

interface RepairForm {
  description: string;
  date: string;
}

const EMPTY_REPAIR_FORM: RepairForm = { description: '', date: '' };

@Component({
  selector: 'app-my-product-detail',
  imports: [CommonModule, FormsModule, TranslatePipe, Toast, AppHeader, EmptyState, Skeleton, Icon],
  templateUrl: './my-product-detail.html',
  styleUrl: './my-product-detail.scss',
})
export class MyProductDetail implements OnInit {
  twinId = 0;
  twin: DigitalTwinDetail | null = null;
  productImage: string | undefined;
  loading = true;
  hasError = false;

  notes = '';
  savingNotes = false;

  showRepairForm = false;
  repairForm: RepairForm = { ...EMPTY_REPAIR_FORM };
  addingRepair = false;

  constructor(
    private orderService: OrderService,
    private productService: Product,
    private toastService: ToastService,
    private translateService: TranslateService,
    private route: ActivatedRoute,
    public router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.twinId = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
  }

  load(): void {
    this.loading = true;
    this.hasError = false;
    this.orderService.getMyProductDetail(this.twinId).subscribe({
      next: (response) => {
        this.twin = response.data;
        this.notes = response.data.notes ?? '';
        this.loading = false;
        this.cdr.detectChanges();
        this.loadProductImage(response.data.productId);
      },
      error: () => {
        this.hasError = true;
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private loadProductImage(productId: number): void {
    this.productService.getProductById(productId).subscribe({
      next: (response) => {
        this.productImage = response.data.imageUrl;
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  saveNotes(): void {
    if (!this.twin) return;
    this.savingNotes = true;
    this.orderService.updateNotes(this.twin.id, this.notes).subscribe({
      next: (response) => {
        this.twin = response.data;
        this.savingNotes = false;
        this.toastService.show(this.translateService.instant('SAVED'), 'success');
        this.cdr.detectChanges();
      },
      error: () => {
        this.savingNotes = false;
        this.toastService.show(this.translateService.instant('TOAST_FAILED_SAVE_NOTES'), 'error');
        this.cdr.detectChanges();
      }
    });
  }

  toggleRepairForm(): void {
    this.showRepairForm = !this.showRepairForm;
    this.repairForm = { ...EMPTY_REPAIR_FORM };
  }

  get isRepairFormValid(): boolean {
    return this.repairForm.description.trim().length > 0 && this.repairForm.date.trim().length > 0;
  }

  submitRepair(): void {
    if (!this.twin || !this.isRepairFormValid) return;
    this.addingRepair = true;
    this.orderService.addRepairEntry(this.twin.id, this.repairForm.description.trim(), this.repairForm.date).subscribe({
      next: (response) => {
        this.twin = response.data;
        this.addingRepair = false;
        this.showRepairForm = false;
        this.repairForm = { ...EMPTY_REPAIR_FORM };
        this.toastService.show(this.translateService.instant('TOAST_REPAIR_ADDED'), 'success');
        this.cdr.detectChanges();
      },
      error: () => {
        this.addingRepair = false;
        this.toastService.show(this.translateService.instant('TOAST_FAILED_ADD_REPAIR'), 'error');
        this.cdr.detectChanges();
      }
    });
  }
}

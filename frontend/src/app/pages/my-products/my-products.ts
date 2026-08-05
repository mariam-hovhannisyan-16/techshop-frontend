import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { OrderService, DigitalTwinSummary } from '../../services/order';
import { Product } from '../../services/product';
import { Toast } from '../../components/toast/toast';
import { AppHeader } from '../../components/app-header/app-header';
import { EmptyState } from '../../components/empty-state/empty-state';
import { Skeleton } from '../../components/skeleton/skeleton';
import { Icon } from '../../components/icon/icon';

@Component({
  selector: 'app-my-products',
  imports: [CommonModule, TranslatePipe, Toast, AppHeader, EmptyState, Skeleton, Icon],
  templateUrl: './my-products.html',
  styleUrl: './my-products.scss',
})
export class MyProducts implements OnInit {
  twins: DigitalTwinSummary[] = [];
  loading = true;
  hasError = false;

  private imageByName = new Map<string, string | undefined>();

  constructor(
    private orderService: OrderService,
    private productService: Product,
    public router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.hasError = false;
    forkJoin({
      twins: this.orderService.getMyProducts(),
      catalog: this.productService.getAllProducts()
    }).subscribe({
      next: ({ twins, catalog }) => {
        this.imageByName = new Map(catalog.data.map(p => [p.name, p.imageUrl]));
        this.twins = twins.data;
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

  imageFor(twin: DigitalTwinSummary): string | undefined {
    return this.imageByName.get(twin.productName);
  }

  viewTwin(id: number): void {
    this.router.navigate(['/my-products', id]).then();
  }
}

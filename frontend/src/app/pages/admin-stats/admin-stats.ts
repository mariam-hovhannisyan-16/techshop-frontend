import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AdminStatsService, AdminStatsSummary } from '../../services/admin-stats';
import { AppHeader } from '../../components/app-header/app-header';
import { Icon } from '../../components/icon/icon';
import { Toast } from '../../components/toast/toast';
import { StatTile } from '../../components/stat-tile/stat-tile';
import { PricePipe } from '../../pipes/price';

const MIN_DAYS_FOR_TREND_CHART = 3;

@Component({
  selector: 'app-admin-stats',
  imports: [CommonModule, TranslatePipe, AppHeader, Icon, Toast, StatTile, PricePipe],
  templateUrl: './admin-stats.html',
  styleUrl: './admin-stats.scss',
})
export class AdminStats implements OnInit {
  stats: AdminStatsSummary | null = null;
  loading = true;
  errorMessage = '';

  constructor(
    private adminStatsService: AdminStatsService,
    public router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.loading = true;
    this.errorMessage = '';
    this.adminStatsService.getSummary().subscribe({
      next: (stats) => {
        this.stats = stats;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'FAILED_TO_LOAD_STATS';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  get topProductsMax(): number {
    if (!this.stats?.topProducts.length) return 0;
    return Math.max(...this.stats.topProducts.map(p => p.quantitySold));
  }

  barWidthPercent(quantitySold: number): number {
    if (this.topProductsMax === 0) return 0;
    return Math.round((quantitySold / this.topProductsMax) * 100);
  }

  get hasTrendChart(): boolean {
    return (this.stats?.ordersByDay.length ?? 0) >= MIN_DAYS_FOR_TREND_CHART;
  }

  get ordersByDayMax(): number {
    if (!this.stats?.ordersByDay.length) return 0;
    return Math.max(...this.stats.ordersByDay.map(d => d.revenue));
  }

  columnHeightPercent(revenue: number): number {
    if (this.ordersByDayMax === 0) return 0;
    return Math.round((revenue / this.ordersByDayMax) * 100);
  }
}

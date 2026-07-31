import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AdminStatsService, AdminStatsSummary } from '../../services/admin-stats';
import { AppHeader } from '../../components/app-header/app-header';
import { Icon } from '../../components/icon/icon';
import { Toast } from '../../components/toast/toast';
import { PricePipe } from '../../pipes/price';

@Component({
  selector: 'app-admin-stats',
  imports: [CommonModule, TranslatePipe, AppHeader, Icon, Toast, PricePipe],
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
}

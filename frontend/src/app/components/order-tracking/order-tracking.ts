import { Component, Input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

export interface TrackingStage {
  labelKey: string;
  state: 'complete' | 'pending' | 'cancelled';
  timestamp?: string;
}

@Component({
  selector: 'app-order-tracking',
  imports: [TranslatePipe, DatePipe],
  templateUrl: './order-tracking.html',
  styleUrl: './order-tracking.scss',
})
export class OrderTracking {
  @Input({ required: true }) status!: string;
  @Input({ required: true }) createdAt!: string;

  get stages(): TrackingStage[] {
    const normalized = this.status?.toLowerCase();

    if (normalized === 'cancelled') {
      return [
        { labelKey: 'TRACK_PLACED', state: 'complete', timestamp: this.createdAt },
        { labelKey: 'TRACK_CANCELLED', state: 'cancelled' }
      ];
    }

    return [
      { labelKey: 'TRACK_PLACED', state: 'complete', timestamp: this.createdAt },
      { labelKey: 'TRACK_PAID', state: normalized === 'paid' ? 'complete' : 'pending' }
    ];
  }
}

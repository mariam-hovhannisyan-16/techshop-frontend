import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Icon, IconName } from '../icon/icon';

interface TrustBadge {
  icon: IconName;
  titleKey: string;
  subtitleKey: string;
}

@Component({
  selector: 'app-trust-badges',
  imports: [TranslatePipe, Icon],
  templateUrl: './trust-badges.html',
  styleUrl: './trust-badges.scss',
})
export class TrustBadges {
  readonly badges: TrustBadge[] = [
    { icon: 'truck', titleKey: 'TRUST_DELIVERY_TITLE', subtitleKey: 'TRUST_DELIVERY_SUB' },
    { icon: 'shield-check', titleKey: 'TRUST_PAYMENT_TITLE', subtitleKey: 'TRUST_PAYMENT_SUB' },
    { icon: 'refresh', titleKey: 'TRUST_RETURNS_TITLE', subtitleKey: 'TRUST_RETURNS_SUB' },
    { icon: 'badge-check', titleKey: 'TRUST_WARRANTY_TITLE', subtitleKey: 'TRUST_WARRANTY_SUB' }
  ];
}

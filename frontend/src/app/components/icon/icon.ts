import { Component, Input } from '@angular/core';

export type IconName =
  | 'user' | 'box' | 'heart' | 'logout' | 'cart' | 'search'
  | 'flame' | 'warning' | 'check-circle' | 'save' | 'phone' | 'copy' | 'pin'
  | 'moon' | 'sun' | 'truck' | 'shield-check' | 'refresh' | 'badge-check'
  | 'monitor' | 'smartphone' | 'laptop' | 'headphones' | 'gamepad' | 'tablet'
  | 'plug' | 'cash' | 'card' | 'compass' | 'bolt' | 'grid'
  | 'arrow-left' | 'eye' | 'eye-off' | 'message-circle' | 'send' | 'close'
  | 'edit' | 'lock' | 'mail' | 'google' | 'info' | 'bell' | 'plus' | 'trash'
  | 'calculator' | 'sparkle' | 'filter';

@Component({
  selector: 'app-icon',
  imports: [],
  templateUrl: './icon.html',
  styleUrl: './icon.scss',
})
export class Icon {
  @Input({ required: true }) name!: IconName;
  @Input() filled = false;
}

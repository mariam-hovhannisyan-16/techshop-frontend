import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageSwitcher } from '../language-switcher/language-switcher';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-top-bar',
  imports: [TranslatePipe, LanguageSwitcher, Icon],
  templateUrl: './top-bar.html',
  styleUrl: './top-bar.scss',
})
export class TopBar {
  phoneMenuOpen = false;

  readonly supportNumber = '+374 60 500-500';

  togglePhoneMenu(): void {
    this.phoneMenuOpen = !this.phoneMenuOpen;
  }

  copyNumber(): void {
    navigator.clipboard?.writeText(this.supportNumber);
    this.phoneMenuOpen = false;
  }
}

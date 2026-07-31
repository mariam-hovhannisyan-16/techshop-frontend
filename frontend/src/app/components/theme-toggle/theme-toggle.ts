import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ThemeService, Theme } from '../../services/theme';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-theme-toggle',
  imports: [Icon, TranslatePipe],
  templateUrl: './theme-toggle.html',
  styleUrl: './theme-toggle.scss',
})
export class ThemeToggle {
  constructor(private themeService: ThemeService) {}

  get theme(): Theme {
    return this.themeService.current();
  }

  toggle(): void {
    this.themeService.toggle();
  }
}

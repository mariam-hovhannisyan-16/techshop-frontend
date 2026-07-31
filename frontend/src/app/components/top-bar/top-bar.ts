import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageSwitcher } from '../language-switcher/language-switcher';
import { Icon } from '../icon/icon';

interface CityOption {
  id: string;
  labelKey: string;
}

@Component({
  selector: 'app-top-bar',
  imports: [TranslatePipe, LanguageSwitcher, Icon],
  templateUrl: './top-bar.html',
  styleUrl: './top-bar.scss',
})
export class TopBar {
  cityMenuOpen = false;
  phoneMenuOpen = false;

  readonly cities: CityOption[] = [
    { id: 'yerevan', labelKey: 'REGION_YEREVAN' },
    { id: 'aragatsotn', labelKey: 'REGION_ARAGATSOTN' },
    { id: 'ararat', labelKey: 'REGION_ARARAT' },
    { id: 'armavir', labelKey: 'REGION_ARMAVIR' },
    { id: 'gegharkunik', labelKey: 'REGION_GEGHARKUNIK' },
    { id: 'lori', labelKey: 'REGION_LORI' },
    { id: 'kotayk', labelKey: 'REGION_KOTAYK' },
    { id: 'shirak', labelKey: 'REGION_SHIRAK' },
    { id: 'syunik', labelKey: 'REGION_SYUNIK' },
    { id: 'vayots-dzor', labelKey: 'REGION_VAYOTS_DZOR' },
    { id: 'tavush', labelKey: 'REGION_TAVUSH' }
  ];
  selectedCity = this.cities[0];

  readonly supportNumber = '+374 60 500-500';

  toggleCityMenu(): void {
    this.cityMenuOpen = !this.cityMenuOpen;
    this.phoneMenuOpen = false;
  }

  selectCity(city: CityOption): void {
    this.selectedCity = city;
    this.cityMenuOpen = false;
  }

  togglePhoneMenu(): void {
    this.phoneMenuOpen = !this.phoneMenuOpen;
    this.cityMenuOpen = false;
  }

  copyNumber(): void {
    navigator.clipboard?.writeText(this.supportNumber);
    this.phoneMenuOpen = false;
  }
}

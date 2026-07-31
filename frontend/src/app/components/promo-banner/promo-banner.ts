import { Component, EventEmitter, Output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

export interface LineupPhoto {
  src: string;
  altKey: string;
}

export interface PromoBannerSlide {
  titleKey: string;
  subtitleKey: string;
  ctaKey: string;
  ctaAction: 'shop' | 'deals';
  lineup: LineupPhoto[];
}

@Component({
  selector: 'app-promo-banner',
  imports: [TranslatePipe],
  templateUrl: './promo-banner.html',
  styleUrl: './promo-banner.scss',
})
export class PromoBanner {
  @Output() ctaClick = new EventEmitter<'shop' | 'deals'>();

  readonly slides: PromoBannerSlide[] = [
    {
      titleKey: 'PROMO_BANNER_TITLE',
      subtitleKey: 'PROMO_BANNER_SUBTITLE',
      ctaKey: 'PROMO_BANNER_CTA',
      ctaAction: 'shop',
      lineup: [
        { src: 'https://images.unsplash.com/photo-1748188664960-2367faa37adf?w=900&q=80&fit=crop&auto=format', altKey: 'PROMO_ALT_MACBOOK_HEADPHONES' },
        { src: 'https://images.unsplash.com/photo-1515054562254-30a1b0ebe227?w=900&q=80&fit=crop&auto=format', altKey: 'PROMO_ALT_IPHONE_WATCH' }
      ]
    },
    {
      titleKey: 'PROMO_BANNER2_TITLE',
      subtitleKey: 'PROMO_BANNER2_SUBTITLE',
      ctaKey: 'PROMO_BANNER_CTA',
      ctaAction: 'shop',
      lineup: [
        { src: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=900&q=80&fit=crop&auto=format', altKey: 'PROMO_ALT_TABLET' },
        { src: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=900&q=80&fit=crop&auto=format', altKey: 'PROMO_ALT_EARBUDS' }
      ]
    },
    {
      titleKey: 'PROMO_BANNER3_TITLE',
      subtitleKey: 'PROMO_BANNER3_SUBTITLE',
      ctaKey: 'PROMO_BANNER_CTA',
      ctaAction: 'shop',
      lineup: [
        { src: 'https://images.unsplash.com/photo-1736173155811-e8142fd553ee?w=900&q=80&fit=crop&auto=format', altKey: 'PROMO_ALT_IPHONE' },
        { src: 'https://images.unsplash.com/photo-1651241680016-cc9e407e7dc3?w=900&q=80&fit=crop&auto=format', altKey: 'PROMO_ALT_MACBOOK' }
      ]
    },
    {
      titleKey: 'PROMO_BANNER4_TITLE',
      subtitleKey: 'PROMO_BANNER4_SUBTITLE',
      ctaKey: 'PROMO_BANNER_CTA',
      ctaAction: 'shop',
      lineup: [
        { src: 'https://images.unsplash.com/photo-1606741965429-8d76ff50bb2f?w=900&q=80&fit=crop&auto=format', altKey: 'PROMO_ALT_AIRPODS' },
        { src: 'https://images.unsplash.com/photo-1653179767387-35ce2dbdbb5d?w=900&q=80&fit=crop&auto=format', altKey: 'PROMO_ALT_SAMSUNG_PHONE' }
      ]
    },
    {
      titleKey: 'PROMO_BANNER5_TITLE',
      subtitleKey: 'PROMO_BANNER5_SUBTITLE',
      ctaKey: 'PROMO_BANNER_DEALS_CTA',
      ctaAction: 'deals',
      lineup: [
        { src: 'https://images.unsplash.com/photo-1612858249816-5a91a9fb9886?w=900&q=80&fit=crop&auto=format', altKey: 'PROMO_ALT_HEADPHONES' },
        { src: 'https://images.unsplash.com/photo-1591182136289-67ff16828fd4?w=900&q=80&fit=crop&auto=format', altKey: 'PROMO_ALT_GAME_CONSOLE' }
      ]
    }
  ];

  activeIndex = 0;

  private failedPhotos = new Set<string>();

  get activeSlide(): PromoBannerSlide {
    return this.slides[this.activeIndex];
  }

  isPhotoFailed(src: string): boolean {
    return this.failedPhotos.has(src);
  }

  onPhotoError(src: string): void {
    this.failedPhotos.add(src);
  }

  next(): void {
    this.activeIndex = (this.activeIndex + 1) % this.slides.length;
  }

  prev(): void {
    this.activeIndex = (this.activeIndex - 1 + this.slides.length) % this.slides.length;
  }

  goTo(index: number): void {
    this.activeIndex = index;
  }

  onCtaClick(): void {
    this.ctaClick.emit(this.activeSlide.ctaAction);
  }
}

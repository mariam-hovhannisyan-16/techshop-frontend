import { Component, Input } from '@angular/core';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-star-rating',
  imports: [DecimalPipe],
  templateUrl: './star-rating.html',
  styleUrl: './star-rating.scss',
})
export class StarRating {
  @Input() rating = 0;
  @Input() count: number | null = null;
  @Input() showValue = false;

  get stars(): ('full' | 'half' | 'empty')[] {
    const result: ('full' | 'half' | 'empty')[] = [];
    for (let i = 1; i <= 5; i++) {
      if (this.rating >= i) result.push('full');
      else if (this.rating >= i - 0.5) result.push('half');
      else result.push('empty');
    }
    return result;
  }
}

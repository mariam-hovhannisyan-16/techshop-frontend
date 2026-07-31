import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  imports: [],
  templateUrl: './skeleton.html',
  styleUrl: './skeleton.scss',
})
export class Skeleton {
  @Input() variant: 'card' | 'row' = 'card';
  @Input() count = 3;

  get items(): number[] {
    return Array.from({ length: this.count }, (_, i) => i);
  }
}

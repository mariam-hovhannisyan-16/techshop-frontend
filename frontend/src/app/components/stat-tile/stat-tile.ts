import { Component, Input } from '@angular/core';
import { Icon, IconName } from '../icon/icon';

@Component({
  selector: 'app-stat-tile',
  imports: [Icon],
  templateUrl: './stat-tile.html',
  styleUrl: './stat-tile.scss',
})
export class StatTile {
  @Input({ required: true }) icon!: IconName;
  @Input({ required: true }) value!: string | number;
  @Input({ required: true }) label!: string;
}

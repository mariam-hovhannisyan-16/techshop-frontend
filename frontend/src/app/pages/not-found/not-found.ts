import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Icon } from '../../components/icon/icon';

@Component({
  selector: 'app-not-found',
  imports: [TranslatePipe, Icon],
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss',
})
export class NotFound {
  constructor(public router: Router) {}
}
